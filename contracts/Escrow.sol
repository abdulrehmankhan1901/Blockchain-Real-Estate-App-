//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// use the 'transferFrom' function in the ERC721 standard library
interface IERC721 {
    function transferFrom(address _from, address _to, uint256 _id) external; // allows to move token from one wallet to another
}

contract Escrow {
    address public nftAddress;
    address payable public seller;
    address public inspector;
    address public lender;

    mapping(uint256 => bool) public isListed;
    // for properties of the nft
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => address) public buyer;
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => mapping(address => bool)) public approval;

    modifier onlyBuyer(uint256 nftID){
        require(msg.sender == buyer[nftID], "Only buyer can call this function");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this function");
        _;
    }

    modifier onlyInspector() {
        require(msg.sender == inspector, "Only inspector can call this function");
        _;
    }

    constructor(address _nftAddress, address payable _seller, address _inspector, address _lender){
        nftAddress = _nftAddress;
        seller = _seller;
        inspector = _inspector;
        lender = _lender;
    }

    function list(uint256 nftID, uint256 _purchasePrice, uint256 _escrowAmount, address _buyer) public payable onlySeller {
        IERC721(nftAddress).transferFrom(msg.sender, address(this), nftID); // transfer nft from seller to this contract
        isListed[nftID] = true;
        purchasePrice[nftID] = _purchasePrice;
        escrowAmount[nftID] = _escrowAmount;
        buyer[nftID] = _buyer;
    }

    function depositEarnest(uint256 nftID) public payable onlyBuyer(nftID) {
        require(msg.value >= escrowAmount[nftID]);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // for receiving ether
    receive() external payable {}

    function updateInspectionStatus(uint256 nftID, bool passed) public onlyInspector {
        inspectionPassed[nftID] = passed;
    }

    function approveSale(uint256 nftID) public {
        approval[nftID][msg.sender] = true;
    }

    // -> Require Inspection Status 
    // -> Require sale authorization 
    // -> Require correct funds amount
    // -> Transfer NFT to buyer
    // -> Transfer funds to seller

    function finalizeSale(uint256 nftID) public {
        require(inspectionPassed[nftID]);
        require(approval[nftID][buyer[nftID]]);
        require(approval[nftID][seller]);
        require(approval[nftID][lender]);
        require(address(this).balance >= purchasePrice[nftID]);

        (bool success, ) = payable(seller).call{value: address(this).balance}("");
        require(success);

        isListed[nftID] = false;

        //transfer nft from seller to this account
        IERC721(nftAddress).transferFrom(address(this), buyer[nftID], nftID);
    }

    // if not approved, then refund, otherwise send to seller
    function cancelSale(uint256 nftID) public {
        if (inspectionPassed[nftID] == false){
            payable(buyer[nftID]).transfer(address(this).balance);
        }
        else{
            payable(seller).transfer(address(this).balance);
        }
    }
}
