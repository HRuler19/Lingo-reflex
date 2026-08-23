// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumberField } from './number-field'

/** Renders the field as a controlled input so typing accumulates. */
function renderField(initial = '5', min = 1) {
  const onValueChange = vi.fn()
  const view = render(
    <NumberField value={initial} onValueChange={onValueChange} min={min} label="How many" />,
  )
  const rerenderWith = (value: string) =>
    view.rerender(
      <NumberField value={value} onValueChange={onValueChange} min={min} label="How many" />,
    )
  return { onValueChange, rerenderWith }
}

const field = () => screen.getByRole('spinbutton', { name: 'How many' })

describe('NumberField', () => {
  it('replaces what the native number input provided, without using one', () => {
    renderField('5')
    // The whole point of the component: no browser-drawn stepper.
    expect(field().getAttribute('type')).toBe('text')
    expect(field().getAttribute('inputmode')).toBe('numeric')
  })

  it('exposes its value and floor to assistive technology', () => {
    renderField('5')
    expect(field().getAttribute('aria-valuenow')).toBe('5')
    expect(field().getAttribute('aria-valuemin')).toBe('1')
  })

  it('steps with its own buttons', async () => {
    const user = userEvent.setup()
    const { onValueChange } = renderField('5')

    await user.click(screen.getByRole('button', { name: /increase how many/i }))
    expect(onValueChange).toHaveBeenLastCalledWith('6')

    await user.click(screen.getByRole('button', { name: /decrease how many/i }))
    expect(onValueChange).toHaveBeenLastCalledWith('4')
  })

  it('steps with the arrow keys, as the native field did', async () => {
    const user = userEvent.setup()
    const { onValueChange } = renderField('5')

    await user.click(field())
    await user.keyboard('{ArrowUp}')
    expect(onValueChange).toHaveBeenLastCalledWith('6')

    await user.keyboard('{ArrowDown}')
    expect(onValueChange).toHaveBeenLastCalledWith('4')
  })

  it('will not step below the minimum', () => {
    renderField('1', 1)
    expect(screen.getByRole('button', { name: /decrease/i }).hasAttribute('disabled')).toBe(true)
  })

  it('steps up to the minimum from an empty field rather than to NaN', async () => {
    const user = userEvent.setup()
    const { onValueChange } = renderField('', 1)

    await user.click(screen.getByRole('button', { name: /increase/i }))
    expect(onValueChange).toHaveBeenLastCalledWith('1')
  })

  it('accepts digits only', async () => {
    const user = userEvent.setup()
    const { onValueChange, rerenderWith } = renderField('')

    // A plain text field would happily take these; the caller only ever
    // wants a whole number back.
    await user.type(field(), '-1e2')
    for (const call of onValueChange.mock.calls) expect(call[0]).toMatch(/^\d*$/)

    onValueChange.mockClear()
    rerenderWith('4')
    await user.type(field(), '2')
    expect(onValueChange).toHaveBeenLastCalledWith('42')
  })

  it('lets the field be cleared while editing', async () => {
    const user = userEvent.setup()
    const { onValueChange } = renderField('20')

    await user.clear(field())
    expect(onValueChange).toHaveBeenLastCalledWith('')
  })

  it('marks itself invalid when told to', () => {
    render(<NumberField value="" onValueChange={vi.fn()} label="How many" invalid />)
    expect(screen.getByRole('spinbutton').getAttribute('aria-invalid')).toBe('true')
  })
})
