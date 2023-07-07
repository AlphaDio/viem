import type {
  Abi,
  AbiParametersToPrimitiveTypes,
  ExtractAbiFunction,
  ExtractAbiFunctionNames,
} from 'abitype'

import type { Client } from '../../clients/createClient.js'
import type { BaseError } from '../../errors/base.js'
import type { Chain } from '../../types/chain.js'
import type {
  ContractFunctionParameters,
  ContractFunctionReturnType,
} from '../../types/contract2.js'
import { decodeFunctionResult } from '../../utils/abi/decodeFunctionResult.js'
import { encodeFunctionData } from '../../utils/abi/encodeFunctionData.js'
import { getContractError } from '../../utils/errors/getContractError.js'

import { type CallParameters, call } from './call.js'

export type ReadContractParameters<
  abi extends Abi | readonly unknown[] = Abi,
  functionName extends abi extends Abi
    ? ExtractAbiFunctionNames<abi, 'pure' | 'view'>
    : string = abi extends Abi
    ? ExtractAbiFunctionNames<abi, 'pure' | 'view'>
    : string,
  args extends abi extends Abi
    ? AbiParametersToPrimitiveTypes<
        ExtractAbiFunction<abi, functionName>['inputs'],
        'inputs'
      >
    : readonly unknown[] = any,
> = ContractFunctionParameters<abi, 'pure' | 'view', functionName, args> &
  Pick<CallParameters, 'account' | 'blockNumber' | 'blockTag'>

export type ReadContractReturnType<
  abi extends Abi | readonly unknown[] = Abi,
  functionName extends abi extends Abi
    ? ExtractAbiFunctionNames<abi, 'pure' | 'view'>
    : string = abi extends Abi
    ? ExtractAbiFunctionNames<abi, 'pure' | 'view'>
    : string,
  args extends abi extends Abi
    ? AbiParametersToPrimitiveTypes<
        ExtractAbiFunction<abi, functionName, 'pure' | 'view'>['inputs'],
        'inputs'
      >
    : readonly unknown[] = any,
> = ContractFunctionReturnType<abi, 'pure' | 'view', functionName, args>

/**
 * Calls a read-only function on a contract, and returns the response.
 *
 * - Docs: https://viem.sh/docs/contract/readContract.html
 * - Examples: https://stackblitz.com/github/wagmi-dev/viem/tree/main/examples/contracts/reading-contracts
 *
 * A "read-only" function (constant function) on a Solidity contract is denoted by a `view` or `pure` keyword. They can only read the state of the contract, and cannot make any changes to it. Since read-only methods do not change the state of the contract, they do not require any gas to be executed, and can be called by any user without the need to pay for gas.
 *
 * Internally, uses a [Public Client](https://viem.sh/docs/clients/public.html) to call the [`call` action](https://viem.sh/docs/actions/public/call.html) with [ABI-encoded `data`](https://viem.sh/docs/contract/encodeFunctionData.html).
 *
 * @param client - Client to use
 * @param parameters - {@link ReadContractParameters}
 * @returns The response from the contract. Type is inferred. {@link ReadContractReturnType}
 *
 * @example
 * import { createPublicClient, http, parseAbi } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { readContract } from 'viem/contract'
 *
 * const client = createPublicClient({
 *   chain: mainnet,
 *   transport: http(),
 * })
 * const result = await readContract(client, {
 *   address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
 *   abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
 *   functionName: 'balanceOf',
 *   args: ['0xA0Cf798816D4b9b9866b5330EEa46a18382f251e'],
 * })
 * // 424122n
 */
export async function readContract<
  chain extends Chain | undefined,
  const abi extends Abi | readonly unknown[],
  functionName extends abi extends Abi
    ? ExtractAbiFunctionNames<abi, 'pure' | 'view'>
    : string,
  const args extends abi extends Abi
    ? AbiParametersToPrimitiveTypes<
        ExtractAbiFunction<abi, functionName, 'pure' | 'view'>['inputs'],
        'inputs'
      >
    : readonly unknown[],
>(
  client: Client<chain>,
  parameters: ReadContractParameters<abi, functionName, args>,
): Promise<ReadContractReturnType<abi, functionName, args>>

export async function readContract(
  client: Client,
  parameters: ReadContractParameters,
): Promise<ReadContractReturnType> {
  const { abi, address, args, functionName, ...callRequest } = parameters
  const calldata = encodeFunctionData({ abi, args, functionName })
  try {
    const { data } = await call(client, {
      ...(callRequest as unknown as CallParameters),
      data: calldata,
      to: address,
    })
    return decodeFunctionResult({
      abi,
      args,
      functionName,
      data: data || '0x',
    })
  } catch (error) {
    throw getContractError(error as BaseError, {
      abi,
      address,
      args,
      docsPath: '/docs/contract/readContract',
      functionName,
    })
  }
}
