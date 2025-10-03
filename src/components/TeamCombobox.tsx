import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from './ui/utils'
import { Button } from './ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'

interface TeamComboboxProps {
  teams: string[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TeamCombobox({
  teams,
  value,
  onValueChange,
  placeholder = "Select team...",
  disabled = false,
  className
}: TeamComboboxProps) {
  const [open, setOpen] = useState(false)

  // Sort teams alphabetically
  const sortedTeams = [...teams].sort((a, b) => a.localeCompare(b))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-sm h-8",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {value
            ? sortedTeams.find((team) => team === value)
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search team..." className="h-9" />
          <CommandList>
            <CommandEmpty>No team found.</CommandEmpty>
            <CommandGroup>
              {sortedTeams.map((team) => (
                <CommandItem
                  key={team}
                  value={team}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  {team}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === team ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}