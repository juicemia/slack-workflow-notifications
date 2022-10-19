const core = require('@actions/core');
const github = require('@actions/github');
const { WebClient } = require('@slack/web-api');


const statuses = {
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    TIMED_OUT: 'timed_out',
    SUCCESS: 'success'
};

const emojis = {
    [statuses.FAILED]: ':x:',
    [statuses.CANCELLED]: ':no_entry_sign:',
    [statuses.TIMED_OUT]: ':clock10:',
    [statuses.SUCCESS]: ':white_check_mark:'
};

class GithubClient {
    constructor(token) {
        this.octokit = github.getOctokit(token);
        this.context = github.context;
    }

    async getJobs() {
        // Get all jobs except the one that's running this report.
        const jobs = (await this.octokit.paginate(
            this.octokit.rest.actions.listJobsForWorkflowRun,
            { ...this.context.repo, run_id: this.context.runId }
        )).filter(j => `${j.name}` !== context.job);

        return jobs;
    }

    async getCurrentWorkflowRun() {
        const workflow = await this.octokit.rest.actions.getWorkflowRun({
            ...this.context.repo,
            run_id: this.context.runId
        });

        return workflow;
    }
};

function getWorkflowStatus(jobs) {
    let status = statuses.FAILED;

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
};



async function sendSlackNotification(jobs, branch) {
    const context = github.context;
    const workflowStatus = getWorkflowStatus(jobs);

    const blocks = jobs.map(j => {
        return {
            'type': 'section',
            'text': {
                'type': 'mrkdwn',
                // Default to the :moyai: emoji so that it's obvious if something is wrong with the logic.
                'text': `<${j.html_url}|${branch} ${emojis[j.conclusion] || ':moyai:'}>`
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
    const githubClient = new GithubClient(core.getInput('github-token'));

    const jobs = await githubClient.getJobs();
    const branch = (await githubClient.getCurrentWorkflowRun()).head_branch;
    await sendSlackNotification(jobs, branch);
}

run().catch(e => {
    console.error(e);
    core.setFailed(e.message);
});
