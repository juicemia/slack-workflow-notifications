import core from '@actions/core';
import github from '@actions/github';

try {
    // get job statuses for the current workflow run
    const token = core.getInput('github-token');

    const octokit = github.getOctokit(token);
    const context = github.context;

    jobs = octokit.paginate(
        {
            ...context.repo,
            'run_id': context.runId,
        },
    );

    jobs.forEach(job => {
        console.log(`${job}`);
    });

    // create slack payload

    // instantiate slack API client

    // make the call


} catch (error) {
    core.setFailed(error.message);
}

    // // `who-to-greet` input defined in action metadata file
    // const nameToGreet = core.getInput('who-to-greet');
    // console.log(`Hello ${nameToGreet}!`);
    // const time = (new Date()).toTimeString();
    // core.setOutput("time", time);
    // // Get the JSON webhook payload for the event that triggered the workflow
    // const payload = JSON.stringify(github.context.payload, undefined, 2)
    // console.log(`The event payload: ${payload}`);
