import assert from 'node:assert/strict'
import test from 'node:test'
import { isWebtoonCategory, quoteDetails, randomQuote } from './model.ts'

test('recognizes the Korean and English Webtoon category names', () => {
  assert.equal(isWebtoonCategory(' 웹툰 '), true)
  assert.equal(isWebtoonCategory('WEBTOON'), true)
  assert.equal(isWebtoonCategory('소설'), false)
})

test('formats a Webtoon episode separately from its source', () => {
  assert.equal(
    quoteDetails({ author: '고태린', source: '과학고 사변', episode: '24' }),
    '— 고태린 · 과학고 사변 · 24화',
  )
  assert.equal(
    quoteDetails({ author: '시카', source: '슬라임증후군', episode: '마지막화' }),
    '— 시카 · 슬라임증후군 · 마지막화',
  )
})

test('a redraw cannot immediately repeat when another Quote exists', () => {
  const quotes = [{ id: 'first' }, { id: 'second' }]
  assert.equal(randomQuote(quotes, 'first')?.id, 'second')
  assert.equal(randomQuote([{ id: 'only' }], 'only')?.id, 'only')
})
