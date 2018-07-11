const AuctionChannel = artifacts.require("AuctionChannel");

const fs = require('fs');

module.exports = class AuctionLogic {

    /**
     * Constructor
     * @param web3 web3 instance
     * @param auctionChannel auction channel contract
     */
    constructor(
        web3,
        auctionChannel
    ) {
        this.web3 = web3;
        this.auctionChannel = auctionChannel;
        this.auctionStorage = {};
        this.auctionStorage.bidchain = [];
   
    }

    async init() {
        this.auctionStorage.contractAddress = this.auctionChannel.address;
        this.auctionStorage.auctioneer = await this.auctionChannel.auctioneer.call();
        this.auctionStorage.assistant = await this.auctionChannel.assistant.call();
        this.auctionStorage.challengePeriod = await this.auctionChannel.challengePeriod.call();
        this.auctionStorage.minBid = await this.auctionChannel.minBidValue.call();
    }

    /**
     * Propose a bid, sign and return
     * @param params bid params such as isAskBid, bidder, bidValue, 
     * @return new object containing auction params and proposal side
     * signature for adding bid
     */
    async proposeBid(params) {
        const isAskBid = params.isAskBid;
        const bidder = params.bidder;
        const bidValue = params.bidValue;

        let previousBidHash = "";
        if (this.auctionStorage.bidchain.length > 0) {
            const lastBid = this.getLastBid();
            previousBidHash = this.calculateBidHash(lastBid);

            if (bidValue < lastBid.bidValue) {
                throw new Error('bidValue is too low')
            }
        }

        const fingerprint = this.web3.utils.soliditySha3(
            'auctionBid',
            isAskBid,
            bidder,
            bidValue,
            previousBidHash
        );

        let signature0;

        if (isAskBid == true) {
            signature0 = await this.signByAuctioneer(fingerprint);
        } else {
            signature0 = await this.signByAssistant(fingerprint);
        }

        return {
            isAskBid,
            bidder,
            bidValue,
            previousBidHash,
            signature0
        }
    }

    /**
     * Accept a bid, sign and save to storage
     * @param bid object representing bid with proposal side signature
     */
    async acceptBid(bid) {
        const fingerprint = this.web3.utils.soliditySha3(
            'auctionBid',
            bid.isAskBid,
            bid.bidder,
            bid.bidValue,
            bid.previousBidHash
        );

        let signature1;
        if (bid.isAskBid == false) {
            signature1 = await this.signByAuctioneer(fingerprint);
        } else {
            signature1 = await this.signByAssistant(fingerprint);
        }

        bid.signature1 = signature1;
        this.auctionStorage.bidchain.push(bid);
    }

    // Post bid to the blockchain
    async updateWinnerBid(winnerBid) {

        if (winnerBid.isAskBid) {
            throw new Error('AskBid cannot be a winner')
        }
        await this.auctionChannel.updateWinnerBid(
            winnerBid.isAskBid,
            winnerBid.bidder,
            winnerBid.bidValue,
            winnerBid.previousBidHash,
            winnerBid.signature0,
            winnerBid.signature1
        );
    }

    // Try to close the channel
    async tryClose() {
        await this.auctionChannel.tryClose();
    }

    // Sign data by assistant
    async signByAssistant(fingerprint) {
        let assistantWallet;
        let path = __dirname + '/../data/keys/assistantWallet.json';
        if (fs.existsSync(path)) {
            assistantWallet = JSON.parse(fs.readFileSync(path, 'utf8'));
        }
        let response = await this.web3.eth.accounts.sign(fingerprint, assistantWallet.privateKey);
        return response.signature;
    }

    // Sign data by auctioneer
    async signByAuctioneer(fingerprint) {
        let auctioneerWallet;
        let path = __dirname + '/../data/keys/auctioneerWallet.json';
        if (fs.existsSync(path)) {
            auctioneerWallet = JSON.parse(fs.readFileSync(path, 'utf8'));
        }
        let response = await this.web3.eth.accounts.sign(fingerprint, auctioneerWallet.privateKey);
        return response.signature;
    }

    // Save auctionStorage obj to the file
    saveStorage() {
        let path = __dirname + '/../data/storage/auctionStorage.json';
        fs.writeFileSync(path, JSON.stringify(this.auctionStorage), 'utf-8');
    }

    // Calculate hash of the bid
    calculateBidHash(bid) {
        let isAskBid = bid.isAskBid;
        let bidder = bid.bidder;
        let bidValue = bid.bidValue;
        let previousBidHash = bid.previousBidHash;

        return this.web3.utils.soliditySha3(
            isAskBid,
            bidder,
            bidValue,
            previousBidHash
        );
    }

    // Get the latest bid from the storage
    getLastBid() {
        let bidchainSize = this.auctionStorage.bidchain.length;
        return this.auctionStorage.bidchain[bidchainSize - 1];
    }


}
