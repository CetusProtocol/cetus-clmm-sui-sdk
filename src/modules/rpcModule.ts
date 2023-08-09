import { TransactionBlock } from '@mysten/sui.js/transactions'
import {
  DynamicFieldPage,
  PaginatedEvents,
  PaginatedObjectsResponse,
  SuiClient,
  SuiEventFilter,
  SuiObjectDataOptions,
  SuiObjectResponseQuery,
  SuiTransactionBlockResponse,
} from '@mysten/sui.js/client'
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'
import { Secp256k1Keypair } from '@mysten/sui.js/keypairs/secp256k1'

import { DataPage, PaginationArgs, SuiObjectIdType } from '../types'

export class RpcModule extends SuiClient {
  /**
   * Get events for a given query criteria
   * @param query
   * @param paginationArgs
   * @returns
   */
  async queryEventsByPage(query: SuiEventFilter, paginationArgs: PaginationArgs = 'all'): Promise<DataPage<any>> {
    let result: any = []
    let hasNextPage = true
    const queryAll = paginationArgs === 'all'
    let nextCursor = queryAll ? null : paginationArgs.cursor

    do {
      const res: PaginatedEvents = await this.queryEvents({
        query,
        cursor: nextCursor,
        limit: queryAll ? null : paginationArgs.limit,
      })
      if (res.data) {
        result = [...result, ...res.data]
        hasNextPage = res.hasNextPage
        nextCursor = res.nextCursor
      } else {
        hasNextPage = false
      }
    } while (queryAll && hasNextPage)

    return { data: result, nextCursor, hasNextPage }
  }

  /**
   * Get all objects owned by an address
   * @param owner
   * @param query
   * @param paginationArgs
   * @returns
   */
  async getOwnedObjectsByPage(
    owner: string,
    query: SuiObjectResponseQuery,
    paginationArgs: PaginationArgs = 'all'
  ): Promise<DataPage<any>> {
    let result: any = []
    let hasNextPage = true
    const queryAll = paginationArgs === 'all'
    let nextCursor = queryAll ? null : paginationArgs.cursor
    do {
      const res: PaginatedObjectsResponse = await this.getOwnedObjects({
        owner,
        ...query,
        cursor: nextCursor,
        limit: queryAll ? null : paginationArgs.limit,
      })
      if (res.data) {
        result = [...result, ...res.data]
        hasNextPage = res.hasNextPage
        nextCursor = res.nextCursor
      } else {
        hasNextPage = false
      }
    } while (queryAll && hasNextPage)

    return { data: result, nextCursor, hasNextPage }
  }

  /**
   * Return the list of dynamic field objects owned by an object
   * @param parentId
   * @param paginationArgs
   * @returns
   */
  async getDynamicFieldsByPage(parentId: SuiObjectIdType, paginationArgs: PaginationArgs = 'all'): Promise<DataPage<any>> {
    let result: any = []
    let hasNextPage = true
    const queryAll = paginationArgs === 'all'
    let nextCursor = queryAll ? null : paginationArgs.cursor
    do {
      const res: DynamicFieldPage = await this.getDynamicFields({
        parentId,
        cursor: nextCursor,
        limit: queryAll ? null : paginationArgs.limit,
      })
      if (res.data) {
        result = [...result, ...res.data]
        hasNextPage = res.hasNextPage
        nextCursor = res.nextCursor
      } else {
        hasNextPage = false
      }
    } while (queryAll && hasNextPage)

    return { data: result, nextCursor, hasNextPage }
  }

  /**
   * Batch get details about a list of objects. If any of the object ids are duplicates the call will fail
   * @param ids
   * @param options
   * @param limit
   * @returns
   */
  async batchGetObjects(ids: SuiObjectIdType[], options?: SuiObjectDataOptions, limit = 50): Promise<any[]> {
    let objectDataResponses: any[] = []

    try {
      for (let i = 0; i < Math.ceil(ids.length / limit); i++) {
        const res = await this.multiGetObjects({
          ids: ids.slice(i * limit, limit * (i + 1)),
          options,
        })
        objectDataResponses = [...objectDataResponses, ...res]
      }
    } catch (error) {
      console.log(error)
    }

    return objectDataResponses
  }

  async calculationTxGas(tx: TransactionBlock): Promise<number> {
    const { sender } = tx.blockData

    if (sender === undefined) {
      throw Error('sdk sender is empty')
    }

    const devResult = await this.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    })
    const { gasUsed } = devResult.effects

    const estimateGas = Number(gasUsed.computationCost) + Number(gasUsed.storageCost) - Number(gasUsed.storageRebate)
    return estimateGas
  }

  async sendTransaction(
    keypair: Ed25519Keypair | Secp256k1Keypair,
    tx: TransactionBlock
  ): Promise<SuiTransactionBlockResponse | undefined> {
    try {
      const resultTxn: any = await this.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: keypair,
        options: {
          showEffects: true,
          showEvents: true,
        },
      })
      return resultTxn
    } catch (error) {
      console.log('error: ', error)
    }
    return undefined
  }
}
