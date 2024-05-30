/* -------------------------------------------------------------------------- */
/*                              Helper functions                              */
/* -------------------------------------------------------------------------- */

import {
  SuiObjectData,
  SuiObjectRef,
  SuiObjectResponse,
  OwnedObjectRef,
  ObjectOwner,
  DisplayFieldsResponse,
  SuiMoveObject,
  SuiParsedData,
} from '@mysten/sui/client'

/* -------------------------- SuiObjectResponse ------------------------- */

export function getSuiObjectData(resp: SuiObjectResponse): SuiObjectData | null | undefined {
  return resp.data
}

export function getObjectDeletedResponse(resp: SuiObjectResponse): SuiObjectRef | undefined {
  if (resp.error && 'object_id' in resp.error && 'version' in resp.error && 'digest' in resp.error) {
    const { error } = resp
    return {
      objectId: error.object_id,
      version: error.version,
      digest: error.digest,
    } as SuiObjectRef
  }

  return undefined
}

export function getObjectNotExistsResponse(resp: SuiObjectResponse): string | undefined {
  if (resp.error && 'object_id' in resp.error && !('version' in resp.error) && !('digest' in resp.error)) {
    return resp.error.object_id as string
  }

  return undefined
}

export function getObjectReference(resp: SuiObjectResponse | OwnedObjectRef): SuiObjectRef | undefined {
  if ('reference' in resp) {
    return resp.reference
  }
  const exists = getSuiObjectData(resp)
  if (exists) {
    return {
      objectId: exists.objectId,
      version: exists.version,
      digest: exists.digest,
    }
  }
  return getObjectDeletedResponse(resp)
}

/* ------------------------------ SuiObjectRef ------------------------------ */

export function getObjectId(data: SuiObjectResponse | SuiObjectRef | OwnedObjectRef): string {
  if ('objectId' in data) {
    return data.objectId
  }
  return getObjectReference(data)?.objectId ?? getObjectNotExistsResponse(data as SuiObjectResponse)!
}

export function getObjectVersion(data: SuiObjectResponse | SuiObjectRef | SuiObjectData): string | number | undefined {
  if ('version' in data) {
    return data.version
  }
  return getObjectReference(data)?.version
}

/* -------------------------------- SuiObject ------------------------------- */

export function isSuiObjectResponse(resp: SuiObjectResponse | SuiObjectData): resp is SuiObjectResponse {
  return (resp as SuiObjectResponse).data !== undefined
}

function isSuiObjectDataWithContent(data: SuiObjectData): data is SuiObjectDataWithContent {
  return data.content !== undefined
}

export function getMovePackageContent(data: SuiObjectResponse): any | undefined {
  const suiObject = getSuiObjectData(data)
  if (suiObject?.content?.dataType !== 'package') {
    return undefined
  }
  return suiObject.content.disassembled
}
export function getMoveObject(data: SuiObjectResponse | SuiObjectData): SuiMoveObject | undefined {
  const suiObject = 'data' in data ? getSuiObjectData(data) : (data as SuiObjectData)

  if (!suiObject || !isSuiObjectDataWithContent(suiObject) || suiObject.content.dataType !== 'moveObject') {
    return undefined
  }

  return suiObject.content as SuiMoveObject
}

export function getMoveObjectType(resp: SuiObjectResponse): string | undefined {
  return getMoveObject(resp)?.type
}

/**
 * Deriving the object type from the object response
 * @returns 'package' if the object is a package, move object type(e.g., 0x2::coin::Coin<0x2::sui::SUI>)
 * if the object is a move object
 */
export function getObjectType(resp: SuiObjectResponse | SuiObjectData): string | null | undefined {
  const data = isSuiObjectResponse(resp) ? resp.data : resp

  if (!data?.type && 'data' in resp) {
    if (data?.content?.dataType === 'package') {
      return 'package'
    }
    return getMoveObjectType(resp)
  }
  return data?.type
}

export function getObjectPreviousTransactionDigest(resp: SuiObjectResponse): string | null | undefined {
  return getSuiObjectData(resp)?.previousTransaction
}

export function getObjectOwner(resp: SuiObjectResponse): ObjectOwner | null | undefined {
  return getSuiObjectData(resp)?.owner
}

export function getObjectDisplay(resp: SuiObjectResponse): DisplayFieldsResponse {
  const display = getSuiObjectData(resp)?.display
  if (!display) {
    return { data: null, error: null }
  }
  return display
}

/**
 * Get the fields of a sui object response or data. The dataType of the object must be moveObject.
 * @param {SuiObjectResponse | SuiObjectData}object The object to get the fields from.
 * @returns {any} The fields of the object.
 */
export function getObjectFields(object: SuiObjectResponse | SuiObjectData): any {
  const fields = getMoveObject(object)?.fields
  if (fields) {
    if ('fields' in fields) {
      return fields.fields
    }
    return fields
  }
  return undefined
}

export interface SuiObjectDataWithContent extends SuiObjectData {
  content: SuiParsedData
}

/**
 * Return hasPublicTransfer of a move object.
 * @param {SuiObjectResponse | SuiObjectData}data
 * @returns
 */
export function hasPublicTransfer(data: SuiObjectResponse | SuiObjectData): boolean {
  return getMoveObject(data)?.hasPublicTransfer ?? false
}
