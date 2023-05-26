//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// make the NFT code according to the ERC721 standard
// the code for this can be found on zeppelin
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";


// make NFT
contract RealEstate is ERC721URIStorage {
    // create ERC721 token instead of making it from scratch
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("Real Estate", "REAL") {}

    function mint(string memory tokenURI) public returns (uint256) {
        _tokenIds.increment(); //update token ids

        uint256 newItemId = _tokenIds.current();
        // calling functions from the URIStorage
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }

    function totalSupply() public view returns (uint256){
        return _tokenIds.current();
    }
}
