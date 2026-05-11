"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:2rem]",
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("flex flex-col gap-4 md:flex-row"),
        month: cn("flex w-full flex-col gap-4"),
        nav: cn("flex justify-between"),
        button_previous: cn(""),
        button_next: cn(""),
        month_caption: cn("flex justify-center"),
        dropdowns: cn("flex justify-center gap-1.5"),
        caption_label: cn("text-sm font-medium"),
        table: "w-full border-collapse",
        weekdays: cn("flex"),
        weekday: cn("flex-1 text-center text-xs"),
        week: cn("flex w-full"),
        day: cn("flex-1 text-center"),
        today: cn("bg-accent"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon {...props} />
          }
          if (orientation === "right") {
            return <ChevronRightIcon {...props} />
          }
          return <ChevronDownIcon {...props} />
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn(className)}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }