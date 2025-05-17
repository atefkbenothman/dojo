"use client"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { X } from "lucide-react"
import { useState } from "react"

export function VideoPopup() {
  const [isOpen, setIsOpen] = useState(true)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
  }

  const videoSrc = "/demo.mp4"

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0">
        <div className="p-4">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-semibold">Demo</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              See how Dojo works in action
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video">
            <video src={videoSrc} controls autoPlay className="w-full h-full" tabIndex={-1} />
          </div>
        </div>
        <DialogClose className="absolute right-4 top-4 opacity-70 ...">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
