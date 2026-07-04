"use client"

import { useEffect, useState } from "react"

interface DateDisplayProps {
  timestamp: number
  className?: string
  /**
   * If true, shows absolute date on hover
   */
  showAbsolute?: boolean
}

/**
 * Relative date display component
 * Shows "2 min ago", "1h ago", "Yesterday", etc.
 * Updates automatically for recent dates
 */
export function DateDisplay({ timestamp, className, showAbsolute = true }: DateDisplayProps) {
  const [relativeTime, setRelativeTime] = useState("")

  /**
   * Calculate relative time string
   */
  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) {
      return "just now"
    } else if (minutes < 60) {
      return `${minutes} min ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else if (days === 1) {
      return "Yesterday"
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      // For older dates, show absolute date
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: now - timestamp > 365 * 24 * 60 * 60 * 1000 ? "numeric" : undefined,
      }).format(new Date(timestamp))
    }
  }

  /**
   * Get absolute date string for tooltip
   */
  const getAbsoluteDate = (timestamp: number): string => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp))
  }

  // Update relative time on mount and periodically
  useEffect(() => {
    const updateTime = () => {
      setRelativeTime(getRelativeTime(timestamp))
    }

    updateTime()

    // Update more frequently for recent dates
    const now = Date.now()
    const diff = now - timestamp
    const updateInterval = diff < 60000 ? 10000 : diff < 3600000 ? 60000 : 300000 // 10s, 1m, or 5m

    const interval = setInterval(updateTime, updateInterval)
    return () => clearInterval(interval)
  }, [timestamp])

  if (showAbsolute) {
    return (
      <time
        dateTime={new Date(timestamp).toISOString()}
        title={getAbsoluteDate(timestamp)}
        className={className}
      >
        {relativeTime}
      </time>
    )
  }

  return (
    <time dateTime={new Date(timestamp).toISOString()} className={className}>
      {relativeTime}
    </time>
  )
}
