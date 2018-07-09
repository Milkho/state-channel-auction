const AuctionChannel = artifacts.require('AuctionChannel');
const Web3 = require('web3');
const fs = require('fs');

module.exports =  function(deployer, network) {
   
    const web3 = new Web3(Web3.currentProvider);

    let secrets;
    let secretsPath = __dirname + '/../secrets.json';
    if (fs.existsSync('secrets.json')) {
        secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
    } else {
        throw new Error('No secrets.json found!');
    }

    const isMainNet = network === 'mainnet';

    let auctioneer = "0xF9F59233150830E32b221ddC0867a0E549d8eCD0";
    let assistant = "0x50Eab0373fD3Acf72cd85eFCf973EE75C5dA244c";

    if (isMainNet) {
        auctioneer = "0xef0f527e21C4BC56cE9122D8d92F59c018A58319";
        assistant = "0x2Da262A1B2eeAB1F2b4c1F1317Ae43cdE0b5B8B5";
    }

    let challengePeriod = 720; // 720 blocks ~ 3 hours
    let minBidValue = 50000;

    const fingerprint = web3.utils.soliditySha3(
        "openingAuctionChannel",
        auctioneer,
        assistant,
        challengePeriod,
        minBidValue
    );

    let auctioneerWallet;
    let aucPath = __dirname + '/../data/keys/auctioneerWallet.json';
    if (fs.existsSync(aucPath)) {
        auctioneerWallet = JSON.parse(fs.readFileSync(aucPath, 'utf8'));
    }

    let assistantWallet;
    let asPath = __dirname + '/../data/keys/assistantWallet.json';
    if (fs.existsSync(asPath)) {
        assistantWallet = JSON.parse(fs.readFileSync(asPath, 'utf8'));
    }
    
    const responseAuctioneer = web3.eth.accounts.sign(fingerprint, isMainNet ? secrets.keys.auctioneer : auctioneerWallet.privateKey);
    const responseAssistant = web3.eth.accounts.sign(fingerprint, isMainNet ? secrets.keys.assistant : assistantWallet.privateKey);

    deployer.deploy(
        AuctionChannel,
        auctioneer,
        assistant,
        challengePeriod,
        minBidValue,
        responseAuctioneer.signature,
        responseAssistant.signature,
        { gas: 1500000}
    );


};