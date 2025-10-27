import { randomUUID } from 'crypto'
import { Express } from 'express'

interface Sn {
  m: string
  e: number
}

let snMap = new Map<string, Sn>()

export function defineRoute(app: Express) {
  app.get('/kook/api/v1', (req, res) => {
    res.send(new Date().toISOString())
  })

  app.get('/kook/api/v1/download', (req, res) => {
    const fileName = (req.query.file as string) || ''
    if (!fileName) {
      res.status(400).send('file is required')
      return
    }

    const filePath = `/tmp/${fileName}`
    res.download(filePath, fileName, (err) => {
      if (err) {
        res.status(500).send(err.message)
      }
    })
  })

  app.post('/snr/:id', (req, res) => {
    const { id } = req.params || {}
    const { ua } = req.body || {}

    if (!id || !ua || typeof ua !== 'string') {
      res.status(400).send('id and ua are required')
      return
    }

    if (ua.includes('micromessenger')) {
      res.json({
        code: 1,
      })
      return
    }

    if (!snMap.has(id)) {
      res.json({
        code: 2,
      })
      return
    }

    const sn = snMap.get(id)!
    if (Date.now() > sn.e) {
      res.json({
        code: 3,
      })
      return
    }

    const m = sn.m
    if (!snMap.delete(id)) {
      res.json({
        code: 4,
      })
      return
    }

    res.json({
      code: 0,
      m: m,
    })
  })

  app.post('sn', (req, res) => {
    const { sn, e } = req.body || {}
    if (!sn || typeof sn !== 'string' || !e || typeof e !== 'number') {
      res.status(400).send('sn, e is required')
      return
    }

    const id = randomUUID()
    const now = Date.now()

    if (e < now) {
      res.status(400).send('e should be greater than now')
      return
    }

    if (e - now > 24 * 60 * 60 * 1000) {
      res.status(400).send('e should be less than 24 hours')
      return
    }

    snMap.set(id, {
      m: sn,
      e: e,
    })

    res.json({
      code: 0,
      id: id,
    })
  })
}
