const https = require('https');
const Twitter =  require('twitter');
require('dotenv').config();

const HOST = 'saopaulo.sp.gov.br';
const POPULATION = 238339;

const CHARS = ['█', '▓', '░'];
const BAR_SIZE = 15, PERCENT_GAP = 100 / BAR_SIZE;

const client = new Twitter({
    consumer_key: process.env.API_KEY,
    consumer_secret: process.env.API_SECRET_KEY,
    access_token_key: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

let previousData = [];

function fetchData(date){
    let month = (date.getMonth() + 1).toString();
    let day  = date.getDate().toString();

    if(month.length === 1) month = '0' + month;
    if(day.length === 1) day = '0' + day;

    const options = {
        hostname: HOST,
        method: 'GET',
        path: `/wp-content/uploads/2021/${month}/2021${month}${day}_vacinometro.csv`
    }

    let response;

    // https://nodejs.dev/learn/making-http-requests-with-nodejs
    const req = https.request(options, res => {
        res.on('data', data => response += data)
        res.on('end', () => parseData(response))
    });

    console.log('FETCH: ' + HOST + options.path);

    req.on('error', err => console.error(err))
    req.end();
}

function parseData(response){
    let lastIndex = 0;
    let data = [];

    while(lastIndex != -1){
        lastIndex = response.indexOf("ARARAQUARA", lastIndex + 1);
        if(lastIndex === -1) break
        data.push(response.substr(lastIndex, 25));
    }

    let finalData = [];

    for(let d of data){
        // regex ?

        let newD = d.split(";");
        newD = newD[newD.length-1].split('\r');
        finalData.push(newD[0]);
    }

    calculateVaccination(finalData);
}

function calculateVaccination(data){
    singleDose = Number(data[0]);
    firstDose  = Number(data[2]);
    secondDose = Number(data[1]);

    if(!isNewData(singleDose, firstDose, secondDose)) return;

    sglDPercent = (singleDose * 100 / POPULATION).toFixed(2);
    fstDPercent = (firstDose  * 100 / POPULATION).toFixed(2);
    sndDPercent = (secondDose * 100 / POPULATION).toFixed(2);

    updateStatus(sglDPercent, fstDPercent, sndDPercent, singleDose, firstDose, secondDose);
}

function isNewData(s, fst, snd){
    if(previousData[0] == s &&
        previousData[1] == fst &&
        previousData[2] == snd){
        
        return false
    }

    previousData[0] = s;
    previousData[1] = fst
    previousData[2] = snd;

    return true;
}

function generateProgressBar(percent){
    let finalBar = '';
    let fill = Math.trunc(percent / PERCENT_GAP);

    for(let i = 0; i < fill; i++){
        finalBar += CHARS[0];
    }

    if(percent - fill * 5 > 0){
        fill++;
        finalBar += CHARS[1];
    }

    for(let i = 0; i < BAR_SIZE - fill; i++) {
        finalBar += CHARS[2];
    }
     
    return finalBar;
}

function updateStatus(sglDpct, fstDpct, sndDpct, sglDose, fstDose, sndDose){

    let total = (Number(sndDpct) + Number(sglDpct)).toFixed(2);

    let msg = `Totalmente Vacinados\n${generateProgressBar(total)} ${total}%\n\nPrimeira Dose\n${generateProgressBar(fstDpct)} ${fstDpct}%\n\nSegunda Dose\n${generateProgressBar(sndDpct)} ${sndDpct}%\n\nDose Única\n${generateProgressBar(sglDpct)} ${sglDpct}%`

    client.post('statuses/update', { status: msg })
        .then(r =>  console.log(`You successfully tweeted this : ${r.text}`))
        .catch(console.error);
}

function update(){
    fetchData(new Date());
    setInterval(update, 1000 * 60 * 60 * 24);
}

update();