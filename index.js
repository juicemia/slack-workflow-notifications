const core = require('@actions/core');
const github = require('@actions/github');

const FAILED = 'failed';
const CANCELLED = 'cancelled';
const TIMED_OUT = 'timed_out';
const SUCCESS = 'success';

function getWorkflowStatus(jobs) {
    const status = FAILED;

    // For a workflow to be considered successful, every job must be successful.
    if (!jobs.find(j => j.conclusion !== SUCCESS)) {
        status = SUCCESS;
    } else {
        // Every subsequent condition is more important than the last. Simply
        // overwriting the status keeps the logic more straightforward.
        if (jobs.some(j => j.conclusion === CANCELLED)) {
            status = CANCELLED;
        }

        if (jobs.some(j => j.conclustion === TIMED_OUT)) {
            status = TIMED_OUT;
        }

        if (jobs.some(j => j.conclusion === FAILED)) {
            status = FAILED;
        }
    }
}

const run = async () => {
    // get job statuses for the current workflow run
    const token = core.getInput('github-token');

    const octokit = github.getOctokit(token);
    const context = github.context;

    console.log(context);

    const jobs = (await octokit.paginate(
        octokit.rest.actions.listJobsForWorkflowRun,
        { ...context.repo, run_id: '3284243608' }
    )).filter(j => `${j.id}` !== context.job);

    console.log(jobs);

    const workflowStatus = getWorkflowStatus(jobs);
    console.log(`Got workflow status: ${workflowStatus}`);

    // const payload = {
    //     "blocks": [
    //         {
    //             "type": "header",
    //             "text": {
    //                 "type": "plain_text",
    //                 "text": "${{ (job.status == 'success' && ':white_check_mark:') || (job.status == 'failure' && ':x:') || (job.status == 'cancelled' && ':no_entry_sign:') }} ${{ github.repository }} - ${{ job.status }}"
    //             }
    //         },
    //         {
    //             "type": "section",
    //             "fields": [
    //                 {
    //                     "type": "mrkdwn",
    //                     "text": "*Branch*"
    //                 },
    //                 {
    //                     "type": "mrkdwn",
    //                     "text": "<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|${{ github.ref_name }}>"
    //                 }
    //             ]
    //         }
    //     ]
    // }

    // create slack payload

    // instantiate slack API client

    // make the call

}

run().catch(e => {
    console.error(e);
    core.setFailed(error.message);
});

    // // `who-to-greet` input defined in action metadata file
    // const nameToGreet = core.getInput('who-to-greet');
    // console.log(`Hello ${nameToGreet}!`);
    // const time = (new Date()).toTimeString();
    // core.setOutput("time", time);
    // // Get the JSON webhook payload for the event that triggered the workflow
    // const payload = JSON.stringify(github.context.payload, undefined, 2)
    // console.log(`The event payload: ${payload}`);
