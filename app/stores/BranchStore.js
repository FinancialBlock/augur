"use strict";

var moment = require("moment");
var constants = require("../libs/constants");

module.exports = {
  state: {
    branches: [],
    currentBranch: null
  },
  getState: function () {
    return this.state;
  },
  /**
   * Get the start and end of the report publication period, the second half of
   * the reporting period.
   * @param  {int} currentBlock - The current block number.
   * @return {Array[Moment]} A two-element array of Moments.
   */
  getReportPublishDates: function (currentBlock) {
    var periodStartBlock = (this.state.reportPeriod + 1) * this.state.currentBranch.periodLength;
    var publishStartBlock = periodStartBlock + (this.state.periodLength / 2);
    var publishStart = moment().subtract((currentBlock - publishStartBlock) * constants.SECONDS_PER_BLOCK, "seconds");
    var publishEnd = publishStart.clone().add(this.state.periodLength / 2 * constants.SECONDS_PER_BLOCK, "seconds");
    return [publishStart, publishEnd];
  },
  periodDuration: function () {
    return moment.duration(this.state.periodLength * constants.SECONDS_PER_BLOCK, "seconds");
  },
  isReportCommitPeriod: function (blockNumber) {
    var periodLength = this.state.periodLength;
    return ((blockNumber % periodLength) < (periodLength / 2));
  },
  isReportRevealPeriod: function (blockNumber) {
    return !this.isReportCommitPeriod(blockNumber);
  },
  getCurrentBranch: function () {
    if (this.state.currentBranch && this.state.currentBranch.id) {
      return this.state.currentBranch;
    } else {
      return {id: process.env.AUGUR_BRANCH_ID || 1010101};
    }
  },
  handleLoadBranchesSuccess: function (payload) {
    this.state.branches = payload.branches;
    this.emit(constants.CHANGE_EVENT);
  },
  handleUpdateCurrentBranchSuccess: function (branch) {
    branch.currentPeriod = branch.currentPeriod || 0;
    branch.reportPeriod = branch.reportPeriod || 0;
    branch.isCurrent = branch.isCurrent || false;
    branch.percentComplete = branch.percentComplete || 0;
    this.state.currentBranch = branch;
    this.emit(constants.CHANGE_EVENT);
  },
  handleCheckQuorumSent: function (payload) {
    this.state.hasCheckedQuorum = true;
    this.emit(constants.CHANGE_EVENT);
  },
  handleCheckQuorumSuccess: function (payload) {
    this.state.hasCheckedQuorum = false;
    this.emit(constants.CHANGE_EVENT);
  }
};
