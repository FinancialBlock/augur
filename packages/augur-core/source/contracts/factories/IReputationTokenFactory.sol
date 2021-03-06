pragma solidity 0.5.4;

import 'ROOT/IAugur.sol';
import 'ROOT/reporting/IUniverse.sol';
import 'ROOT/reporting/IV2ReputationToken.sol';


contract IReputationTokenFactory {
    function createReputationToken(IAugur _augur, IUniverse _universe, IUniverse _parentUniverse) public returns (IV2ReputationToken);
}
