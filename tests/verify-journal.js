const assert = require('assert')

function appendToNoteContent(content, headings, text) {
  if (headings.length === 0) {
    return content + (content.endsWith('\n') ? '' : '\n') + text
  }

  let lines = content.split('\n')
  let searchStartIndex = 0
  let searchEndIndex = lines.length

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i]
    const level = i + 2 // Starting from H2
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

// Mocking the loop logic
async function mockProcessEntry(tags, heading, content, initialNoteContent) {
  let noteContent = initialNoteContent
  const timestamp = '2023-10-27 10:00:00'

  for (const tag of tags) {
    const parts = tag.split('::')
    const hierarchicalHeadings = parts.slice(1)
    const targetHeadings = [...hierarchicalHeadings]
    if (heading) {
      targetHeadings.push(heading)
    }

    const timestampLevel = targetHeadings.length + 3
    const entryText = `\n\n${'#'.repeat(timestampLevel)} [${timestamp}]\n${content}`

    noteContent = appendToNoteContent(noteContent, targetHeadings, entryText)
  }
  return noteContent
}

// Test cases
console.log('Running tests for appendToNoteContent and stale state prevention...')

// Case 1: Dynamic heading level
let content = '# Tag\n'
let headings = ['H1']
let text = '\n#### [2023-10-27 10:00:00]\nContent 1'
let result = appendToNoteContent(content, headings, text)
assert(result.includes('## H1'))
assert(result.includes('#### [2023-10-27 10:00:00]'))
console.log('Case 1 passed')

// Case 2: Stale state prevention (multiple tags same note)
async function testStaleState() {
  const initialContent = '# MyNote\n'
  const tags = ['MyNote::SectionA', 'MyNote::SectionB']
  const heading = 'Update'
  const entryContent = 'Some content'

  const finalContent = await mockProcessEntry(tags, heading, entryContent, initialContent)

  assert(finalContent.includes('## SectionA'))
  assert(finalContent.includes('### Update'))
  assert(finalContent.includes('## SectionB'))
  assert(finalContent.split('Some content').length === 3) // Appears twice
  console.log('Case 2 (Stale State) passed')
}

testStaleState().then(() => {
  console.log('All tests passed!')
}).catch(err => {
  console.error('Tests failed:', err)
  process.exit(1)
})
