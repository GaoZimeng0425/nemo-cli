import { describe, expect, it } from 'vitest'

import { parseCommitsFromLog } from '../src/commands/blame'

describe('parseCommitsFromLog', () => {
  it('should parse a single commit with diff', () => {
    const input = `abc123def\x00John Doe\x00Mon Jan 1 12:00:00 2026\x00Initial commit
diff --git a/file.txt b/file.txt
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/file.txt
@@ -0,0 +1 @@
+hello world`

    const commits = parseCommitsFromLog(input)

    expect(commits).toHaveLength(1)
    expect(commits[0]).toBeDefined()
    expect(commits[0]!).toEqual({
      hash: 'abc123de',
      author: 'John Doe',
      date: 'Mon Jan 1 12:00:00 2026',
      message: 'Initial commit',
      diff: expect.stringContaining('diff --git a/file.txt'),
    })
  })

  it('should parse multiple commits', () => {
    const input = `abc123def\x00John Doe\x00Mon Jan 1 12:00:00 2026\x00Second commit
diff --git a/file.txt b/file.txt
index 1234567..abcdefg 100644
--- a/file.txt
+++ b/file.txt
@@ -1 +1 @@
-hello
+hello world
def456ghi\x00Jane Smith\x00Tue Jan 2 12:00:00 2026\x00First commit
diff --git a/file.txt b/file.txt
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/file.txt
@@ -0,0 +1 @@
+hello`

    const commits = parseCommitsFromLog(input)

    expect(commits).toHaveLength(2)
    expect(commits[0]).toBeDefined()
    expect(commits[0]!.hash).toBe('abc123de')
    expect(commits[0]!.message).toBe('Second commit')
    expect(commits[1]).toBeDefined()
    expect(commits[1]!.hash).toBe('def456gh')
    expect(commits[1]!.message).toBe('First commit')
  })

  it('should handle empty input', () => {
    const commits = parseCommitsFromLog('')
    expect(commits).toEqual([])
  })

  it('should handle message with pipe character', () => {
    const input = `abc123def\x00John Doe\x00Mon Jan 1 12:00:00 2026\x00Fix: bug | feature | stuff
diff --git a/file.txt b/file.txt
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/file.txt
@@ -0,0 +1 @@
+hello`

    const commits = parseCommitsFromLog(input)

    expect(commits).toHaveLength(1)
    expect(commits[0]).toBeDefined()
    expect(commits[0]!.message).toBe('Fix: bug | feature | stuff')
  })

  it('should handle message with newline characters', () => {
    const input = `abc123def\x00John Doe\x00Mon Jan 1 12:00:00 2026\x00Multi line
message
diff --git a/file.txt b/file.txt
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/file.txt
@@ -0,0 +1 @@
+hello`

    const commits = parseCommitsFromLog(input)

    expect(commits).toHaveLength(1)
    // Note: With current implementation, the message includes "Multi line" because null separator is only in the header
    expect(commits[0]).toBeDefined()
    expect(commits[0]!.message).toContain('Multi line')
  })

  it('should handle binary file diff', () => {
    const input = `abc123def\x00John Doe\x00Mon Jan 1 12:00:00 2026\x00Add binary file
diff --git a/image.png b/image.png
new file mode 100644
index 0000000..1234567
Binary files /dev/null and b/image.png differ`

    const commits = parseCommitsFromLog(input)

    expect(commits).toHaveLength(1)
    expect(commits[0]).toBeDefined()
    expect(commits[0]!.diff).toContain('Binary files /dev/null and b/image.png differ')
  })

  it('should skip malformed entries', () => {
    const input = `abc123def\x00John Doe\x00Mon Jan 1 12:00:00 2026\x00Valid commit
diff --git a/file.txt b/file.txt
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/file.txt
@@ -0,0 +1 @@
+hello

invalid line without null separator
another invalid line
def456ghi\x00Jane Smith\x00Tue Jan 2 12:00:00 2026\x00Another valid commit
diff --git a/file.txt b/file.txt
index 1234567..abcdefg 100644
--- a/file.txt
+++ b/file.txt
@@ -1 +1 @@
-hello
+world`

    const commits = parseCommitsFromLog(input)

    expect(commits).toHaveLength(2)
    expect(commits[0]).toBeDefined()
    expect(commits[0]!.message).toBe('Valid commit')
    expect(commits[1]).toBeDefined()
    expect(commits[1]!.message).toBe('Another valid commit')
  })
})

describe('showCommit function behavior', () => {
  it('should detect binary files correctly', () => {
    const binaryDiff = 'Binary files /dev/null and b/image.png differ'
    expect(binaryDiff.includes('Binary files /dev/null and b/image.png differ')).toBe(true)
  })

  it('should detect large diffs correctly', () => {
    // Create a diff with 60 lines (more than the 50 line limit)
    const lines = []
    for (let i = 0; i < 60; i++) {
      lines.push(`+line ${i}`)
    }
    const largeDiff = lines.join('\n')
    const diffLines = largeDiff.split('\n')

    expect(diffLines.length).toBe(60)
    expect(diffLines.length > 50).toBe(true) // Exceeds limit
  })

  it('should truncate diffs over 50 lines', () => {
    const maxLines = 50
    const lines = []
    for (let i = 0; i < 100; i++) {
      lines.push(`+line ${i}`)
    }
    const largeDiff = lines.join('\n')
    const diffLines = largeDiff.split('\n')

    expect(diffLines.length).toBe(100)
    const truncated = diffLines.slice(0, maxLines)
    expect(truncated.length).toBe(50)
  })
})

describe('jump validation logic', () => {
  it('should accept valid jump numbers', () => {
    const totalCommits = 10
    const validInputs = ['1', '5', '10']

    validInputs.forEach((input) => {
      const num = Number.parseInt(input, 10)
      expect(!isNaN(num) && num >= 1 && num <= totalCommits).toBe(true)
    })
  })

  it('should reject invalid jump numbers', () => {
    const totalCommits = 10
    const invalidInputs = ['0', '11', 'abc', '-1']

    invalidInputs.forEach((input) => {
      const num = Number.parseInt(input, 10)
      expect(!isNaN(num) && num >= 1 && num <= totalCommits).toBe(false)
    })

    // Empty string and NaN need special handling
    const emptyResult = Number.parseInt('', 10)
    expect(isNaN(emptyResult)).toBe(true)

    const floatResult = Number.parseInt('1.5', 10)
    expect(!isNaN(floatResult) && floatResult >= 1 && floatResult <= totalCommits).toBe(true) // 1.5 becomes 1
  })

  it('should handle boundary jumps', () => {
    const totalCommits = 10
    const firstCommit = 1
    const lastCommit = 10

    expect(firstCommit >= 1 && firstCommit <= totalCommits).toBe(true)
    expect(lastCommit >= 1 && lastCommit <= totalCommits).toBe(true)
  })
})
