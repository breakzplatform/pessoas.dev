import { cn } from "@/lib/utils"

interface Props {
  number: number | string
  title: string
  disabled?: boolean
  last?: boolean
  children?: React.ReactNode
}

export function Stage({ number, title, disabled, last, children }: Props) {
  return (
    <section className={cn(disabled && "opacity-10")}>
      <div className="flex flex-row items-center h-8">
        <div className="grid place-items-center mr-4 text-center rounded-full size-8 shrink-0 bg-slate-100 dark:bg-slate-800">
          {number}
        </div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div
        className={cn(
          "border-l-1 ml-4 border-l py-6 pl-8",
          last && "border-transparent"
        )}
      >
        {children}
      </div>
    </section>
  )
}
