const AuctionChannel = artifacts.require('AuctionChannel');
const Web3 = require('web3');
const fs = require('fs');

module.exports =  function(deployer, network, accounts) {
   
    const web3 = new Web3(Web3.currentProvider);

    let auctioneer = "0xf823f0F90a1f351Ae04724247e096A2D95F3908F";
    let assistant = "0x08480524f01A797596eF32dee86A01b80BF4A9DA";
    let challengePeriod = 100;
    let minBidValue = 10000000;

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
    
    const responseAuctioneer = web3.eth.accounts.sign(fingerprint, auctioneerWallet.privateKey);
    const responseAssistant = web3.eth.accounts.sign(fingerprint, assistantWallet.privateKey);

    deployer.deploy(
        AuctionChannel,
        auctioneer,
        assistant,
        challengePeriod,
        minBidValue,
        responseAuctioneer.signature,
        responseAssistant.signature,
        { gas: 4200000}
    );


};