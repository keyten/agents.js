const axios = require('axios');
const readline = require('readline');

// Set up readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const output = (text) => console.log(text + '\n\n');
const input = async (question) => {
    return new Promise(resolve => {
        rl.question(question + '\n', resolve);
    });
};
const fgRed = "\x1b[31m";
const fgGreen = "\x1b[32m";
const fgYellow = "\x1b[33m";
const fgBlue = "\x1b[34m";
const fgGray = "\x1b[90m";
const bold = "\x1b[1m";
const reset = "\x1b[0m";
const CHAT_LINE = '---------------------------------------------------------';

const OPENAI_API_KEY = "your api key";

const openAiRequest = async (data) => {
    try {
        const url = 'https://api.openai.com/v1/chat/completions';

        //console.log(`OpenAI request: ${JSON.stringify(data)}`);
        const response = await axios.request({
            method: 'POST',
            url: url,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`
            },
            data: data
        });

        //console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
        return response.data.choices[0].message.content;
    } catch (e) {
        // console.error(`Error: ${e.message}`);
        throw e;
    }
};

const MAXIMUM_STEPS = 40;

module.exports = async (aiConfigs, customerAsk) => {
    const thread = [{
        from: 'Customer',
        message: customerAsk,
    }];

    const composeThread = (currentAi) => ({
        model: "gpt-4",
        messages: [
            {
                role: 'system',
                content: aiConfigs[currentAi].prompt
            },
            ...thread.map(ob => ({
                role: currentAi === ob.from ? 'assistant' : 'user',
                content: `${ob.from}: ${ob.message}`
            }))
        ]
    });

    let steps = 0;
    while (steps++ < MAXIMUM_STEPS) {
        const answer = await openAiRequest(composeThread('Director'));
        output(`${fgRed}${bold}Director:${reset} ${answer}`);
        let match;
        if (match = answer.match(/^reply\(([\w\s]+)\)$/)) {
            const aiName = match[1];
            const aiReply = await openAiRequest(composeThread(aiName));
            output(bold + fgGreen + aiName + ': ' + reset + aiReply + '\n' + fgGray + CHAT_LINE + reset);
            thread.push({
                from: aiName,
                message: aiReply
            });
        } else if (answer.indexOf('ask(') === 0) {
            const question = answer.slice('ask('.length, answer.length - 1);
            thread.push({
                from: 'Customer',
                message: await input(question)
            });
        } else if (answer === 'finish') {
            return thread[thread.length - 1];
        } else {
            throw new Error('Unknown answer from Director AI: ' + answer);
        }
    }
    throw new Error('Steps limit (> than ' + MAXIMUM_STEPS + ')');
};
