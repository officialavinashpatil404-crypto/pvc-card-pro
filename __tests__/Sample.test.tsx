import { render, screen } from '@testing-library/react'

function SampleComponent() {
  return <h1>Hello Next.js</h1>
}

describe('SampleComponent', () => {
  it('renders a heading', () => {
    render(<SampleComponent />)
    const heading = screen.getByRole('heading', { name: /hello next\.js/i })
    expect(heading).not.toBeNull()
  })
})
