import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-2xl border-2 border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-[background-color,color,box-shadow,transform] outline-none select-none active:not-aria-[haspopup]:translate-y-1 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        // Flat, poster-color fill with a solid (no-blur) offset shadow in a
        // darker step of the same hue — the button reads as a chunky
        // pressable block, and flattens for real when it's actually pressed.
        default:
          "bg-primary text-primary-foreground shadow-[0_4px_0_0_color-mix(in_oklch,var(--primary),black_25%)] hover:bg-[color-mix(in_oklch,var(--primary),black_6%)] active:shadow-none dark:shadow-[0_4px_0_0_color-mix(in_oklch,var(--primary),black_35%)]",
        outline:
          "border-border bg-card text-foreground shadow-[0_4px_0_0_var(--border)] hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground active:shadow-none dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_4px_0_0_color-mix(in_oklch,var(--secondary),var(--foreground)_12%)] hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground active:shadow-none",
        ghost:
          "hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground dark:hover:bg-muted/50 active:translate-y-0",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40 active:translate-y-0",
        link: "text-primary underline-offset-4 hover:underline active:translate-y-0",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-lg px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-lg",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
