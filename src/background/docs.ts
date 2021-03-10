import _ from 'lodash'
import ky from 'ky'
import Searcher from '../../vendor/devdocs/assets/javascripts/app/searcher.coffee'
import Entry from '../../vendor/devdocs/assets/javascripts/models/entry.coffee'

class Docs {
  docNames: string[] = []

  docs: ExtendedDoc[] = []

  allDocs: Doc[] = []

  ready = false

  static extendDocs (docs: Doc[]) {
    return Promise.all(_.map(docs, (doc) => Docs.extendDoc(doc)))
  }

  static async extendDoc (doc: Doc) {
    const extendedDoc = {
      ...doc,
      fullName: doc.name + (doc.version ? ` ${doc.version}` : ''),
      slug_without_version: doc.slug.split('~')[0],
      icon: doc.slug.split('~')[0],
      short_version: doc.version ? doc.version.split(' ')[0] : '',
      text: [doc.name, doc.slug]
    }
    const docEntry = new Entry({
      ...extendedDoc,
      ...{
        name: extendedDoc.fullName
      }
    }) as { addAlias: Function } & typeof extendedDoc

    if (docEntry.version) {
      docEntry.addAlias(doc.name)
    }

    const index = await Docs.getDocIndexByName(doc.slug) as Index
    index.entries = _.map(index.entries, (entry) => ({
      ...new Entry(entry),
      doc: { ...extendedDoc }
    }))

    return { ...doc,
      ...index,
      ...docEntry }
  }

  static async getDocIndexByName (docName: string) {
    const docUrl = `https://documents.devdocs.io/${docName}/index.json`
    const index = await ky(docUrl).json()
    return index
  }

  static async getAllDocs () {
    const docsUrl = 'https://devdocs.io/docs/docs.json'
    const docs = await ky(docsUrl).json() as Doc[]
    return docs
  }

  static searchEntriesInDoc (query: string, doc: Doc & Index) {
    const { entries } = doc
    const searcher = new Searcher()

    return new Promise((resolve) => {
      searcher.on('results', (results: typeof entries) => {
        resolve(results)
      })
      searcher.find(entries, 'text', query)
    }) as Promise<typeof entries>
  }

  static attemptToMatchOneDoc<T> (rawQuery: string, docs: T[]) {
    const query = rawQuery.replace('_', ' ')
    const searcher = new Searcher({
      max_results: 1,
      fuzzy_min_length: 1
    })

    return new Promise((resolve) => {
      searcher.on('results', (results: T[]) => {
        const doc = results.length > 0 ? results[0] : null
        resolve(doc)
      })
      searcher.find(docs, 'slug', query)
    }) as Promise<T | null>
  }

  constructor (docNames: string[]) {
    this.docNames = docNames
    this.reload()
  }

  async reload (docNames?: string[]) {
    this.ready = false
    if (docNames) {
      this.docNames = docNames
    }
    this.allDocs = await Docs.getAllDocs()
    const docs = _.filter(this.allDocs, (doc) => _.includes(this.docNames, doc.slug))
    const extendedDocs = await Docs.extendDocs(docs)
    this.docs = extendedDocs
    this.ready = true
  }

  searchEntries (query: string) {
    const groupedEntries = _.map(this.docs, (doc) => doc.entries)
    const entries = _.flatten(groupedEntries)

    const searcher = new Searcher()

    return new Promise((resolve) => {
      searcher.on('results', (results: typeof entries) => {
        resolve(results)
      })
      searcher.find(entries, 'text', query)
    }) as Promise<typeof entries>
  }

  attemptToMatchOneDocInEnabledDocs (query: string) {
    return Docs.attemptToMatchOneDoc(query, this.docs)
  }

  attemptToMatchOneDocInAllDocs (query: string) {
    return Docs.attemptToMatchOneDoc(query, this.allDocs)
  }
}

export default Docs
