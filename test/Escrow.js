const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

// run npx hardhat test for testing
// run npx harhat node to create local blockchain, allows us to deploy without communicating with the web
describe('Escrow', () => {
    let buyer, seller, inspector, lender;
    let realEstate, escrow;

    beforeEach(async () => {
        // harhat can help test on behalf of an account in the list; to allow this we use the following code:
        // setup accounts
        [buyer, seller, inspector, lender] = await ethers.getSigners(); // will give us 20 different account addreses with ether to test
        //console.log(signers);
        // deploy real estate
        const RealEstate = await ethers.getContractFactory('RealEstate');
        realEstate = await RealEstate.deploy();

        // mint (creating a unique token)
        // test url (available on the internet): https://ipfs.io/ipfs/QmQVcpsjrA6crliJjZAodYwmPekYgbnXGo4DFubJiLc2EB/1.json
        let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmQVcpsjrA6crliJjZAodYwmPekYgbnXGo4DFubJiLc2EB/1.json");
        await transaction.wait();

        const Escrow = await ethers.getContractFactory('Escrow');
        escrow = await Escrow.deploy(realEstate.address, seller.address, inspector.address, lender.address);

        // approve property
        transaction = await realEstate.connect(seller).approve(escrow.address, 1); // approve: function of ERC721 standard
        await transaction.wait();

        // list property
        transaction = await escrow.connect(seller).list(1, tokens(10), tokens(5), buyer.address);
        await transaction.wait();
    })

    describe('Deployment', () => {
        // check if the saved adrresses are the same as the passed addresses;
        it ("returns NFT address", async() => {
            const result = await escrow.nftAddress();
            expect(result).to.be.equal(realEstate.address);  // works similar to assert.equal
        })
    
        it ("returns seller", async() => {
            const result = await escrow.seller();
            expect(result).to.be.equal(seller.address); 
        })
        
        it ("returns inspector", async() => {
            const result = await escrow.inspector();
            expect(result).to.be.equal(inspector.address);
        })
    
        it ("returns lender", async() => {
            const result = await escrow.lender();
            expect(result).to.be.equal(lender.address);
        })
    })

    describe('Listing', () => {

        it ("updates listed", async() => {
            const result = await escrow.isListed(1);
            expect(result).to.be.equal(true);
        })

        it ("updates ownership", async() => {
            expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address); // ownerOf: function of ERC721 standard
        })

        it ("returns buyer", async() => {
            const result = await escrow.buyer(1);
            expect(result).to.be.equal(buyer.address);
        })

        it ("returns purchase price", async() => {
            const result = await escrow.purchasePrice(1);
            expect(result).to.be.equal(tokens(10));
        })

        it ("returns escrow amount", async() => {
            const result = await escrow.escrowAmount(1);
            expect(result).to.be.equal(tokens(5));
        })
    })

    describe('Deposits', () => {

        it ("updates balance", async() =>{
            const transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(5)});
            await transaction.wait();
            const balance = await escrow.getBalance();
            expect(balance).to.be.equal(tokens(5));
        })
    })

    describe('Inspection', () => {

        it ("updates inspection status", async() =>{
            const transaction = await escrow.connect(inspector).updateInspectionStatus(1, true);
            await transaction.wait();
            const result = await escrow.inspectionPassed(1);
            expect(result).to.be.equal(true);
        })
    })

    describe('Approval', () => {

        it ("approves sale", async() =>{
            let transaction = await escrow.connect(buyer).approveSale(1);
            await transaction.wait();
            transaction = await escrow.connect(seller).approveSale(1);
            await transaction.wait();
            transaction = await escrow.connect(lender).approveSale(1);
            await transaction.wait();

            expect(await escrow.approval(1,buyer.address)).to.be.equal(true);
            expect(await escrow.approval(1,seller.address)).to.be.equal(true);
            expect(await escrow.approval(1,lender.address)).to.be.equal(true);
        })
    })

    describe('Sale', ()=>{
        beforeEach(async()=>{
            // earnest amount
            let transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(5)});
            await transaction.wait();
            // inspection status
            transaction = await escrow.connect(inspector).updateInspectionStatus(1, true);
            await transaction.wait();
            // approvals
            transaction = await escrow.connect(buyer).approveSale(1);
            await transaction.wait();
            transaction = await escrow.connect(seller).approveSale(1);
            await transaction.wait();
            transaction = await escrow.connect(lender).approveSale(1);
            await transaction.wait();
            // correct funds
            await lender.sendTransaction({to: escrow.address, value: tokens(5)});

            transaction = await escrow.connect(seller).finalizeSale(1);
            await transaction.wait();
        })

        it ("transfers ownership", async() =>{
            expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
        })

        it ("updates balance", async() => {
            expect(await escrow.getBalance()).to.be.equal(0);
        })
    })
})
