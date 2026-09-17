# Product: Load Balancing Lesson

## Problem

Students need a small, observable demonstration of how repeated requests to one public address can be shared across multiple copies of the same counter service.

## Success metric

In a run of 12 repeated requests, the response history shows that all three responders handled at least one request, and the instructor can change the distribution strategy without restarting the complete lesson.

## Announcement — the blog post before the feature

The load-balancing lesson now turns one counter-read request into a visible traffic-distribution demo. Students send the same request repeatedly and each response identifies which of three identical responders handled it. The instructor can then change the distribution strategy and immediately compare the result. The example stays focused on the entry point of the View/Like Counter system and returns a fixed mock count.

## Screens

No UI. Students use Postman or curl and observe responses and logs.
