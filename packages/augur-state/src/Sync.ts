import { Augur } from "@augurproject/api";
import { BigNumber as EthersBigNumber } from "ethers/utils";
import { BlockAndLogStreamerListener } from "./db/BlockAndLogStreamerListener";
import { ContractDependenciesEthers } from "contract-dependencies-ethers";
import { Controller } from "./Controller";
import { EthersProvider } from "@augurproject/ethersjs-provider";
import { EventLogDBRouter } from "./db/EventLogDBRouter";
import { JsonRpcProvider } from "ethers/providers";
import { PouchDBFactory } from "./db/AbstractDB";
import { uploadBlockNumbers, addresses } from "@augurproject/artifacts";

const settings = require("@augurproject/state/src/settings.json");

// TODO Add Ethereum node URL as param
export async function start() {
  const ethersProvider = new EthersProvider(new JsonRpcProvider(settings.ethNodeURLs[4]), 10, 0, 40);
  const contractDependencies = new ContractDependenciesEthers(ethersProvider, undefined, settings.testAccounts[0]);
  const augur = await Augur.create(ethersProvider, contractDependencies, addresses[4]);

  const eventLogDBRouter = new EventLogDBRouter(augur.events.parseLogs);
  const blockAndLogStreamerListener = BlockAndLogStreamerListener.create(ethersProvider, eventLogDBRouter, augur.addresses.Augur, augur.events.getEventTopics);
  const pouchDBFactory = PouchDBFactory({});
  const networkId = Number(augur.networkId);
  const controller = new Controller<EthersBigNumber>(augur, networkId, settings.blockstreamDelay, uploadBlockNumbers[networkId], [settings.testAccounts[0]], pouchDBFactory, blockAndLogStreamerListener);

  console.log("Starting controller");
  return controller.run();
}
