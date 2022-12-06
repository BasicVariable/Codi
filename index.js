// Reminder: This is was a bot that also served as a whitelist backend and whitelist manager; if you see empty space know that some parts were taken out.

const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

const fs = require("fs");
const { Worker } = require("worker_threads")
const delay = ms => new Promise(res => setTimeout(res, ms));

// ----
const discordBot = require("./subFiles/discordBot.js")
// ----

const getRolimonsValues = async () => {
    while (true){
        try{
            let req = await fetch("https://www.rolimons.com/itemapi/itemdetails")
                .catch((err) => console.log(err)) || {};
            if (req.status!=200) {await delay(5000); continue};

            let values = (await req.json()).items
            if (values!=null) return values;
        }catch(err){
            console.log(err)
        };
    };
};

const createWorker = async (filePos, data, actionOnMessage) => {
    try{
        let current_worker = new Worker(
            filePos, 
            {workerData: data}
        );

        current_worker.on('message', (message) => actionOnMessage(message));

        current_worker.once('error', async (err) => console.log(err)); 

        current_worker.once('exit', async () => {
            console.log(`worker closed, restarting`); 
            await delay(5000); 
            createWorker(filePos, data, actionOnMessage)
        });

        return current_worker
    }catch(err){
        console.log(`worker (${filePos}) startup failed\n${err}`)
    }
};

fs.readFile("./settings/config.json", {encoding: 'utf-8'}, async (err, res) => {
    if (err) throw err;

    try{
        global.serverConfig = JSON.parse(res);
        global.botResponses = JSON.parse(await fs.promises.readFile("./settings//customResponses.json", {encoding: 'utf-8'}))
    }catch(err){console.log(`Your config file is either invalid or not in the same folder as index.js\n${err}`)};

    /*
    let valueUpdater = await createWorker("./subFiles/projWorker.js", null, async (message) => {
        global.fixedValues=JSON.parse(message);

        await delay(60000);

        let recentValues = await getRolimonsValues(); 
        valueUpdater.postMessage(JSON.stringify(recentValues))
    });

    valueUpdater.postMessage(
        JSON.stringify(
            await getRolimonsValues()
        )
    );

    // Just to wait for the values to be set, some commands might not work without them in the future
    while (global.fixedValues==null) await delay(1000);

    */
   
    discordBot.start();
})