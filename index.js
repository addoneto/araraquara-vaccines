const Twitter =  require('twitter');
const https = require('https');
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

function getData(date){
    let month = (date.getMonth()  + 1).toString();
    let day   = (date.getDate()   - 1).toString();

    month = month.length === 1 ? '0' + month : month;
    day   = day.length === 1   ? '0' + day : day;

    const options = {
        hostname: HOST,
        method:   'GET',
        path: `/wp-content/uploads/2021/${month}/2021${month}${day}_vacinometro.csv`
    }

    return new Promise((resolve, reject) => {
        let csvData;

        const request = https.request(options, res => {
            res.on('data', data => csvData += data);
            res.on('end' , ()   => { 
                resolve(csvData)
                console.log('\x1b[32m%s\x1b[0m',
                    'Data fetched from: \n' + HOST + options.path);
            });
        });

        request.on('error', err => reject(err));
        request.end();
    });
}

function parseData(resp){
    let lastIndex = 0, data = [], finalData = [];

    while(lastIndex != -1) {
        lastIndex = resp.indexOf("ARARAQUARA", lastIndex + 1);
        if(lastIndex === -1) break;
        data.push(resp.substr(lastIndex, 25));
    }

    for(let d of data){
        let newD = d.split(";");
        newD = newD[newD.length - 1].split('\r');
        finalData.push(newD[0]);
    }

    calcVaccinationRates(finalData);
}

function calcVaccinationRates(data){
    singleDose = Number(data[0]);
    firstDose  = Number(data[2]);
    secondDose = Number(data[1]);

    if(!isNewData(singleDose, firstDose, secondDose)) return;

    sglDPercent = (singleDose * 100 / POPULATION).toFixed(2);
    fstDPercent = (firstDose  * 100 / POPULATION).toFixed(2);
    sndDPercent = (secondDose * 100 / POPULATION).toFixed(2);

    updateStatus(sglDPercent, fstDPercent, sndDPercent);
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

function generateProgressBar(p){
    let finalBar = '';
    let fill = Math.trunc(p / PERCENT_GAP);

    for(let i = 0; i < fill; i++) finalBar += CHARS[0];

    if(p - fill * PERCENT_GAP > 0){
        fill++;
        finalBar += CHARS[1];
    }

    for(let i = 0; i < BAR_SIZE - fill; i++) finalBar += CHARS[2];
     
    return finalBar;
}

function updateStatus(sglDpct, fstDpct, sndDpct){

    let total = (Number(sndDpct) + Number(sglDpct)).toFixed(2);

    let msg = `Totalmente Vacinados\n${generateProgressBar(total)} ${total}%\n\nPrimeira Dose\n${generateProgressBar(fstDpct)} ${fstDpct}%\n\nSegunda Dose\n${generateProgressBar(sndDpct)} ${sndDpct}%\n\nDose Única\n${generateProgressBar(sglDpct)} ${sglDpct}%`;

    client.post('statuses/update', { status: msg })
        .then(r =>  console.log('\x1b[36mm%s\x1b[0m', `Status Updated!`))
        .catch(console.error);
}

function update(){
    getData(new Date())
        .then(result => parseData(result))
        .catch(err   => console.error(err));
}

update();
setInterval(update, 1000 * 60 * 60 * 24);