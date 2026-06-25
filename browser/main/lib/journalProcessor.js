import dataApi from 'browser/main/lib/dataApi'
import moment from 'moment'

async function processEntry({ tags, heading, content, data, dispatch }) {
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss')

  // Local cache for notes being updated in this session to prevent stale state issues
  const noteCache = {}

  for (const tag of tags) {
    const parts = tag.split('::')
    const mainTag = parts[0]
    const hierarchicalHeadings = parts.slice(1)

    // Combine journal entry heading with hierarchical headings if present
    const targetHeadings = [...hierarchicalHeadings]
    if (heading) {
      targetHeadings.push(heading)
    }

    const timestampLevel = Math.min(targetHeadings.length + 3, 6)
    const entryText = `\n\n${'#'.repeat(timestampLevel)} [${timestamp}]\n${content}`

    let note = noteCache[mainTag] || findNoteByTag(mainTag, data)

    if (!note) {
      note = await createNoteForTag(mainTag, data)
      if (!note) continue
      dispatch({
        type: 'UPDATE_NOTE',
        note
      })
    }

    const updatedContent = appendToNoteContent(note.content, targetHeadings, entryText)

    // Ensure we have storage and key. In Boostnote, they should be on the note object if it's already in the store.
    const storageKey = note.storage
    const noteKey = note.key

    const updatedNote = await dataApi.updateNote(storageKey, noteKey, {
      ...note,
      content: updatedContent
    })

    noteCache[mainTag] = updatedNote

    dispatch({
      type: 'UPDATE_NOTE',
      note: updatedNote
    })
  }
}

function findNoteByTag(tag, data) {
  return data.noteMap.map(note => note).find(note => note.tags.includes(tag) && !note.isTrashed)
}

async function createNoteForTag(tag, data) {
  // Use the first storage and its first folder as default
  const storageKeys = Array.from(data.storageMap._map.keys())
  if (storageKeys.length === 0) {
    console.error('No storage found to create note.')
    return null
  }
  const storageKey = storageKeys[0]
  const storage = data.storageMap.get(storageKey)
  if (!storage.folders || storage.folders.length === 0) {
    console.error('No folder found in storage to create note.')
    return null
  }
  const folderKey = storage.folders[0].key

  return await dataApi.createNote(storageKey, {
    type: 'MARKDOWN_NOTE',
    folder: folderKey,
    title: tag,
    content: `# ${tag}\n`,
    tags: [tag]
  })
}

function appendToNoteContent(content, headings, text) {
  if (headings.length === 0) {
    return content + (content.endsWith('\n') ? '' : '\n') + text
  }

  let lines = content.split('\n')
  let searchStartIndex = 0
  let searchEndIndex = lines.length

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i]
    const level = Math.min(i + 2, 6) // Starting from H2, cap at H6
    const headingPrefix = '#'.repeat(level) + ' '
    const headingLine = headingPrefix + heading

    let headingIndex = -1
    for (let j = searchStartIndex; j < searchEndIndex; j++) {
      if (lines[j].trim() === headingLine) {
        headingIndex = j
        break
      }
    }

    if (headingIndex === -1) {
      // Heading not found, append it before searchEndIndex
      lines.splice(searchEndIndex, 0, '', headingLine)
      headingIndex = searchEndIndex + 1
      searchEndIndex += 2
    }

    // Update search range for next level heading or for appending text
    searchStartIndex = headingIndex + 1
    let nextHeadingIndex = -1
    for (let j = searchStartIndex; j < lines.length; j++) {
      const match = lines[j].match(/^(#+)\s/)
      if (match) {
        if (match[1].length <= level) {
          nextHeadingIndex = j
          break
        }
      }
    }
    searchEndIndex = nextHeadingIndex === -1 ? lines.length : nextHeadingIndex

    if (i === headings.length - 1) {
      // Last heading, append text at searchEndIndex
      lines.splice(searchEndIndex, 0, text)
      return lines.join('\n')
    }
  }

  return lines.join('\n')
}

export default {
  processEntry
}
