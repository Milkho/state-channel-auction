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
    });
  
    it('should receive bids', async () => {
        const params = {
            isAskBid: false,
            userHash: 'jskfjdkgjkf',
            bidValue: 20000000,
            previousBidHash: "fdhdfg"
        }
        const bid = await auctionLogic.proposeBid(params);
        await auctionLogic.acceptBid(bid);
            
    });

    it('should post winner bid to blockchain', async () => {
        const bid = auctionLogic.getLastBid();
        await auctionLogic.updateWinnerBid(bid); 
        auctionLogic.saveStorage();     
    });

});