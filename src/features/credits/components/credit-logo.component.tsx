type CreditLogoProps = {
  name: string
}

// Figma «Saldo» → LetterAvatar in the credit rows: the lender's initial on a soft tile, 40 square
export function CreditLogo({ name }: CreditLogoProps) {
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-inner bg-primary-soft text-label font-semibold text-primary-text"
    >
      {name.charAt(0).toLocaleUpperCase()}
    </span>
  )
}
