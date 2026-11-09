import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilePickerButton } from './file-picker-button'

const png = (name: string) => new File(['x'], name, { type: 'image/png' })
const chooser = (label: string) => screen.getByLabelText(label, { selector: 'input' }) as HTMLInputElement

describe('FilePickerButton', () => {
  it('tells the browser what it accepts, and takes one file unless told otherwise', () => {
    render(<FilePickerButton label="Enviar foto" accept={['image/png', 'image/jpeg']} onFiles={vi.fn()} />)
    expect(chooser('Enviar foto')).toHaveAttribute('accept', 'image/png,image/jpeg')
    expect(chooser('Enviar foto')).not.toHaveAttribute('multiple')
  })

  it('opens the file chooser from the button', async () => {
    render(<FilePickerButton label="Enviar foto" accept={['image/png']} onFiles={vi.fn()} />)
    const click = vi.spyOn(chooser('Enviar foto'), 'click')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar foto' }))
    expect(click).toHaveBeenCalledOnce()
  })

  it('hands over what was chosen, and lets the same file be chosen again', async () => {
    const onFiles = vi.fn()
    render(<FilePickerButton label="Enviar fotos" accept={['image/png']} multiple onFiles={onFiles} />)
    expect(chooser('Enviar fotos')).toHaveAttribute('multiple')

    await userEvent.upload(chooser('Enviar fotos'), [png('a.png'), png('b.png')])
    expect(onFiles).toHaveBeenCalledOnce()
    expect(onFiles.mock.calls[0]![0].map((file: File) => file.name)).toEqual(['a.png', 'b.png'])
    expect(chooser('Enviar fotos').value).toBe('')
  })

  it('does not call back when nothing was chosen', () => {
    const onFiles = vi.fn()
    render(<FilePickerButton label="Enviar foto" accept={['image/png']} onFiles={onFiles} />)
    fireEvent.change(chooser('Enviar foto'))
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('cannot be used while disabled', () => {
    render(<FilePickerButton label="Enviar foto" accept={['image/png']} disabled onFiles={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Enviar foto' })).toBeDisabled()
  })
})
