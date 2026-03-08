import { describe, expect, it } from 'vitest'

import { CardBuilder } from '../src/helpers/card-builder'

describe('CardBuilder', () => {
  it('should create a card with default settings', () => {
    const card = CardBuilder.fromTemplate()
    const result = JSON.parse(card.build())
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('card')
    expect(result[0].theme).toBe('secondary')
    expect(result[0].size).toBe('lg')
  })

  it('should set size', () => {
    const card = CardBuilder.fromTemplate().size('sm')
    const result = JSON.parse(card.build())
    expect(result[0].size).toBe('sm')
  })

  it('should set theme', () => {
    const card = CardBuilder.fromTemplate().theme('primary')
    const result = JSON.parse(card.build())
    expect(result[0].theme).toBe('primary')
  })

  it('should set color', () => {
    const card = CardBuilder.fromTemplate().color('#ff0000')
    const result = JSON.parse(card.build())
    expect(result[0].color).toBe('#ff0000')
  })

  it('should add KMarkdown text', () => {
    const card = CardBuilder.fromTemplate().addKMarkdownText('**bold**')
    const result = JSON.parse(card.build())
    expect(result[0].modules[0].type).toBe('section')
    expect(result[0].modules[0].text.type).toBe('kmarkdown')
    expect(result[0].modules[0].text.content).toBe('**bold**')
  })

  it('should add plain text', () => {
    const card = CardBuilder.fromTemplate().addPlainText('hello')
    const result = JSON.parse(card.build())
    expect(result[0].modules[0].text.type).toBe('plain-text')
  })

  it('should add divider', () => {
    const card = CardBuilder.fromTemplate().addDivider()
    const result = JSON.parse(card.build())
    expect(result[0].modules[0].type).toBe('divider')
  })

  it('should add image', () => {
    const card = CardBuilder.fromTemplate().addImage('https://example.com/img.png')
    const result = JSON.parse(card.build())
    expect(result[0].modules[0].type).toBe('container')
    expect(result[0].modules[0].elements[0].src).toBe('https://example.com/img.png')
  })

  it('should add file', () => {
    const card = CardBuilder.fromTemplate().addFile('test.txt', 'https://example.com/file', 1024)
    const result = JSON.parse(card.build())
    expect(result[0].modules[0].type).toBe('file')
    expect(result[0].modules[0].title).toBe('test.txt')
    expect(result[0].modules[0].size).toBe('1024')
  })

  it('should add icon with KMarkdown text', () => {
    const card = CardBuilder.fromTemplate().addIconWithKMarkdownText('https://icon.png', 'text')
    const result = JSON.parse(card.build())
    expect(result[0].modules[0].mode).toBe('left')
    expect(result[0].modules[0].accessory.type).toBe('image')
    expect(result[0].modules[0].text.content).toBe('text')
  })

  it('should add countdown', () => {
    const endTime = Date.now() + 60000
    const card = CardBuilder.fromTemplate().addHourCountDown(endTime)
    const result = JSON.parse(card.build())
    expect(result[0].modules[0].type).toBe('countdown')
    expect(result[0].modules[0].mode).toBe('hour')
    expect(result[0].modules[0].endTime).toBe(endTime)
  })

  it('should add context', () => {
    const card = CardBuilder.fromTemplate().addContext('footer text')
    const result = JSON.parse(card.build())
    expect(result[0].modules[0].type).toBe('context')
    expect(result[0].modules[0].elements[0].content).toBe('footer text')
  })

  it('should add header', () => {
    const card = CardBuilder.fromTemplate().addHeader('Title')
    const result = JSON.parse(card.build())
    expect(result[0].modules[0].type).toBe('header')
    expect(result[0].modules[0].text.content).toBe('Title')
  })

  it('should add action group', () => {
    const card = CardBuilder.fromTemplate().addActionGroup([
      { text: 'Click', value: 'clicked', theme: 'danger' },
    ])
    const result = JSON.parse(card.build())
    expect(result[0].modules[0].type).toBe('action-group')
    expect(result[0].modules[0].elements[0].type).toBe('button')
    expect(result[0].modules[0].elements[0].value).toBe('clicked')
  })

  it('should support chaining', () => {
    const card = CardBuilder.fromTemplate()
      .theme('primary')
      .size('md')
      .color('#0088ff')
      .addHeader('Title')
      .addKMarkdownText('body')
      .addDivider()
      .addContext('footer')

    const result = JSON.parse(card.build())
    expect(result[0].modules).toHaveLength(4)
    expect(result[0].theme).toBe('primary')
    expect(result[0].size).toBe('md')
  })

  it('should undo last module', () => {
    const card = CardBuilder.fromTemplate()
      .addKMarkdownText('keep')
      .addKMarkdownText('remove')
      .undoLastAdd()

    const result = JSON.parse(card.build())
    expect(result[0].modules).toHaveLength(1)
    expect(result[0].modules[0].text.content).toBe('keep')
  })

  it('should create and restore snapshots', () => {
    const card = CardBuilder.fromTemplate().addKMarkdownText('original')
    const snapshot = card.createSnapshot()

    card.addKMarkdownText('added')
    expect(JSON.parse(card.build())[0].modules).toHaveLength(2)

    card.restore(snapshot)
    expect(JSON.parse(card.build())[0].modules).toHaveLength(1)
  })

  it('should report serialized length', () => {
    const card = CardBuilder.fromTemplate()
    expect(card.serializedLength).toBeGreaterThan(0)
    const len1 = card.serializedLength
    card.addKMarkdownText('more content')
    expect(card.serializedLength).toBeGreaterThan(len1)
  })

  it('should use initial card template', () => {
    const card = CardBuilder.fromTemplate({
      initialCard: { theme: 'danger', color: '#ff0000' },
    })
    const result = JSON.parse(card.build())
    expect(result[0].theme).toBe('danger')
    expect(result[0].color).toBe('#ff0000')
  })
})
