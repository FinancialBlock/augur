pragma solidity 0.5.4;

import 'ROOT/reporting/ReputationToken.sol';
import 'ROOT/IAugur.sol';
import 'ROOT/reporting/IUniverse.sol';


contract TestNetReputationToken is ReputationToken {
    uint256 private constant DEFAULT_FAUCET_AMOUNT = 47 ether;

    constructor(IAugur _augur, IUniverse _universe, IUniverse _parentUniverse, address _erc820RegistryAddress) ReputationToken(_augur, _universe, _parentUniverse, _erc820RegistryAddress) public {
    }

    function faucet(uint256 _amount) public returns (bool) {
        if (_amount == 0) {
            _amount = DEFAULT_FAUCET_AMOUNT;
        }
        require(_amount < 2 ** 128);
        mint(msg.sender, _amount);
        return true;
    }
}
