import { describe, expect, it } from 'vitest'
import { parseInbound, senderOf } from '../src/wire.js'

// Regression guard for the delivery-ack wire. The daemon takes messages from
// TWO server paths with DIFFERENT shapes, and getting the schema wrong makes
// the daemon silently drop real-time messages (it did, once — the real-time
// push carries no delivery_id, and a schema that required one rejected every
// live message while the reconnect-drain path worked). These fixtures are
// verbatim captures from the prod `/v1/ws` socket.

describe('parseInbound', () => {
  it('accepts a REAL-TIME push (no delivery_id field at all)', () => {
    // Captured from wss://api.agentchat.me/v1/ws — a message.new payload
    // pushed in real time. Note: no `delivery_id` key.
    const realtime = {
      id: 'msg_4AiWejYkr5DMa2fx',
      conversation_id: 'conv_WntienY94G2kU7F_',
      client_msg_id: 'daemon-dbg-16429',
      seq: 4,
      type: 'text',
      content: { text: 'debug ping' },
      metadata: {},
      created_at: '2026-07-23T21:08:51.604044+00:00',
      sender: 'cxsim-bel',
    }
    const row = parseInbound(realtime)
    expect(row).not.toBeNull()
    expect(row?.id).toBe('msg_4AiWejYkr5DMa2fx')
    expect(row?.conversation_id).toBe('conv_WntienY94G2kU7F_')
    expect(row?.delivery_id).toBeUndefined()
    expect(row?.content?.['text']).toBe('debug ping')
  })

  it('accepts a reconnect-DRAIN row (delivery_id present)', () => {
    const drain = {
      id: 'msg_LoHCySWJfGODK7q-',
      conversation_id: 'conv_WntienY94G2kU7F_',
      delivery_id: 'del_abc123',
      type: 'text',
      content: { text: 'hi' },
      sender: 'cxsim-bel',
    }
    const row = parseInbound(drain)
    expect(row?.delivery_id).toBe('del_abc123')
  })

  it('accepts delivery_id: null (belt-and-suspenders)', () => {
    const row = parseInbound({ id: 'msg_x', conversation_id: 'conv_y', delivery_id: null })
    expect(row).not.toBeNull()
    expect(row?.delivery_id).toBeNull()
  })

  it('rejects a payload missing the required id (cannot ack what has no id)', () => {
    expect(parseInbound({ conversation_id: 'conv_y' })).toBeNull()
  })

  it('rejects a non-object payload', () => {
    expect(parseInbound('nope')).toBeNull()
    expect(parseInbound(null)).toBeNull()
  })
})

describe('senderOf', () => {
  const base = { id: 'm', conversation_id: 'c' }
  it('prefers sender, then sender_handle, then unknown', () => {
    expect(senderOf({ ...base, sender: 'a', sender_handle: 'b' })).toBe('a')
    expect(senderOf({ ...base, sender_handle: 'b' })).toBe('b')
    expect(senderOf({ ...base })).toBe('unknown')
  })
})
