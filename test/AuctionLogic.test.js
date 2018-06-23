const Web3 = require('web3');

const AuctionLogic = require('../src/auctionLogic');


contract('Auction Logic', ([auctioneer, assistant]) => {

    const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

    var auctionLogic = new AuctionLogic(web3);

    this.minBidValue = 10000000;
    this.challengePeriod = 100;
    
    it('should open auction', async () => {
        const params = {
            auctioneerAddress: auctioneer,
            assistantAddress: assistant,
            challengePeriod: this.challengePeriod,
            minBid: this.minBidValue
        }
        const channel = await auctionLogic.proposeOpeningChannel(params);
        
        await auctionLogic.acceptOpeningChannel(channel);
            
        console.log(auctionLogic.auctionStorage);
    });
  

});