const core = require('@actions/core');
const github = require('@actions/github');
const { WebClient } = require('@slack/web-api');


const statuses = {
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    TIMED_OUT: 'timed_out',
    SUCCESS: 'success'
}

const emojis = {
    [statuses.FAILED]: ':x:',
    [statuses.CANCELLED]: ':no_entry_sign:',
    [statuses.TIMED_OUT]: ':clock10:',
    [statuses.SUCCESS]: ':white_check_mark:'
}

function getWorkflowStatus(jobs) {
    const status = statuses.FAILED;

    // For a workflow to be considered successful, every job must be successful.
    if (!jobs.find(j => j.conclusion !== statuses.SUCCESS)) {
        status = statuses.SUCCESS;
    } else {
        // Every subsequent condition is more important than the last. Simply
        // overwriting the status keeps the logic more straightforward.
        if (jobs.some(j => j.conclusion === statuses.CANCELLED)) {
            status = statuses.CANCELLED;
        }

        if (jobs.some(j => j.conclustion === statuses.TIMED_OUT)) {
            status = statuses.TIMED_OUT;
        }

        if (jobs.some(j => j.conclusion === statuses.FAILED)) {
            status = statuses.FAILED;
        }
    }

    return status;
}

async function getJobs() {
    const token = core.getInput('github-token');

    const octokit = github.getOctokit(token);
    const context = github.context;

    console.log(`FILTERING CURRENT JOB ${context.job}`);

    // Get all jobs except the one that's running this report.
    const jobs = (await octokit.paginate(
        octokit.rest.actions.listJobsForWorkflowRun,
        { ...context.repo, run_id: context.runId }
    )).filter(j => {
        console.log(`checking job with name ${j.name}`);

        return `${j.name}` !== context.job;
    });

    return jobs
}

async function sendSlackNotification(jobs) {
    const context = github.context;
    const workflowStatus = getWorkflowStatus(jobs);

    const blocks = jobs.map(j => {
        const url = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}/jobs/${j.id}`;
        // Default to the :moyai: emoji so that it's obvious if something is wrong with the logic.
        const display = `${context.ref} ${emojis[j.conclusion] || ':moyai:'}`;

        return {
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                'text': `<${url}|${display}>`
            }
        }
    });

    const token = core.getInput('slack-token');
    const channels = core.getInput('channels');

    const slack = new WebClient(token);
    await Promise.all(channels.split(',').map(async (channel) => {
        await slack.chat.postMessage({
            channel: channel.trim(),
            blocks: [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": `${emojis[workflowStatus]} ${context.repo.owner}/${context.repo.repo}`
                    }
                },
                ...blocks
            ],
            // Slack recommends including this as a fallback in case Block Kit doesn't work for some reason.
            text: `${emojis[workflowStatus]} ${context.repo.owner}/${context.repo.repo}`
        });
    }));
}

async function run() {
    const jobs = await getJobs();
    await sendSlackNotification(jobs);
}

run().catch(e => {
    console.error(e);
    core.setFailed(e.message);
});
