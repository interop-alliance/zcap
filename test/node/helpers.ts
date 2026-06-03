/*!
 * Copyright (c) 2018-2024 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * A minimal controller-document wrapper used by the tests to look up the
 * verification method for a given verification relationship.
 */
export class Controller {
  doc: any

  constructor(doc: any) {
    // doc is the key controller document
    this.doc = doc
  }

  id(): string {
    return this.doc.id
  }

  get(keyType: string, index: number): any {
    const vm = this.doc[keyType][index]
    if (typeof vm === 'string') {
      // dereference verification method
      return this.doc.verificationMethod.find(({ id }: any) => id === vm)
    }
    return vm
  }
}

/**
 * Generates a random `urn:uuid:` URI.
 *
 * @returns A new `urn:uuid:` URI.
 */
export function uuid(): string {
  return `urn:uuid:${crypto.randomUUID()}`
}
