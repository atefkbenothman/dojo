"use client"

import { Button } from "@/components/ui/button"
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

interface VideoPopupProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function VideoPopup({ isOpen, onOpenChange }: VideoPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0">
        <div className="p-4">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-semibold">Demo</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              See how Dojo works in action
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video">
            <video src={"/demo.mp4"} controls autoPlay className="w-full h-full" tabIndex={-1} />
          </div>
        </div>
        <DialogClose className="absolute right-4 top-4 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

export function DemoVideo() {
  const [isVideoPopupOpen, setIsVideoPopupOpen] = useState(false)

  return (
    <div className="w-full max-w-2xl mt-6 px-2">
      <Button onClick={() => setIsVideoPopupOpen(true)} className="hover:cursor-pointer">
        Watch Demo
      </Button>
      <VideoPopup isOpen={isVideoPopupOpen} onOpenChange={setIsVideoPopupOpen} />
    </div>
  )
}
