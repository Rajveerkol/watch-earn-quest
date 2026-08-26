# Remix of Earn Watch R

WATCH EARN — Mobile Rewards Platform

Build a polished, production-quality mobile-first web application called WATCH EARN.

IMPORTANT PRODUCT RULE

This application must use virtual website coins only.

Do NOT implement:

Real-money betting

Real-money deposits

Cryptocurrency payments

1. BRAND

Application name:

WATCH EARN

Create a premium, trustworthy, modern visual identity.

Do not make it look like a generic AI-generated template.

The design should feel like a polished commercial mobile rewards platform.

Use:

Premium typography

Strong visual hierarchy

Smooth animations

Elegant cards

Subtle gradients

Modern icons

Excellent spacing

Clean mobile navigation

Professional loading and empty states

The exact color palette can be chosen by the designer, but the final result should feel premium and cohesive.

2. PLATFORM

Build the application as a mobile-first/mobile-only web application.

Optimize specifically for:

360px

375px

390px

412px

Do not create a separate desktop-oriented layout.

Desktop browsers may display the mobile application centered on screen, but the actual UI should remain optimized for a phone viewport.

Handle:

Safe-area insets

Mobile browser navigation

Touch interactions

Bottom navigation

Keyboard behavior

Small screens

Long task titles

Loading states

Network failures

Do not allow accidental horizontal scrolling.

3. USER AUTHENTICATION

Viewer

NO viewer login/signup is required.

When a user visits the website for the first time:

Generate a unique anonymous Wallet ID.

Store the wallet identity securely.

Persist the identity for returning visits.

Allow the user to access their wallet through the website.

Example:

WE-8F4K29X7

The Wallet ID must be unique.

Do not expose internal database IDs.

4. COIN SYSTEM

Use a virtual coin system.

Fixed conversion:

1,000 Coins = ₹1

Examples:

₹1 = 1,000 Coins

₹5 = 5,000 Coins

₹10 = 10,000 Coins

The user interface should primarily display Coins, not rupees.

Clearly label them as:

Virtual Coins

The conversion reference can be displayed subtly inside the Wallet section.

5. VIEWER HOME SCREEN

Create a premium home screen.

The exact layout should be professionally designed by you.

Include useful elements such as:

WATCH EARN branding

Current coin balance

Wallet shortcut

Available tasks

Task categories/filtering if useful

Progress indicators

Recent activity

Completed task access

Do not overcrowd the screen.

The user should immediately understand:

“These are tasks I can complete to earn virtual coins.”

6. TASK LIST

Display multiple available tasks.

However:

Only ONE task/video can be active at a time.

A user can browse multiple available tasks, but once they start one:

Other tasks cannot be started simultaneously.

The current task must finish before another task can begin.

Task cards should be professionally designed.

Useful information may include:

Thumbnail

Task title

Reward

Required duration

Status

Remaining completion slots

Completion indicator

Start button

Do not make the cards cluttered.

7. TASK COMPLETION

Each task should have an independent completion flow.

A task can contain an embedded YouTube video for informational/promotional content.

For example, the system can track:

Task session

Required task duration

Active browser session

Completion state

Anti-abuse signals

Server-side completion record

Only after the website's task requirements are satisfied should the virtual reward become eligible.

8. TASK FLOW

Create this polished flow:

Task List

↓

Task Details

↓

Start Task

↓

Active Task Screen

↓

Independent Completion Verification

↓

Completion Animation

↓

Virtual Coins Credited

↓

Reward Confirmation

↓

Next Task Button

The final screen should show something like:

Task Completed

+5,000 Coins

Then:

Next Task

9. ADMIN PANEL

Create a separate secure Admin Panel.

The Admin Panel must have a professional dashboard design.

Admin controls should include:

Dashboard

Display useful analytics:

Total task completions

Active tasks

Paused tasks

Total virtual coins distributed

Total task value

Completion rate

Daily activity

Weekly activity

Monthly activity

Task performance

Remaining task slots

Use beautiful charts and cards.

10. ADMIN LOGIN

Create a secure Admin Login screen.

The Admin Login should fit the WATCH EARN design system but feel more professional/administrative.

Do NOT expose admin credentials in frontend source code.

Use secure authentication/secrets.

The admin identity configured during deployment should be the authorized administrator.

11. ADMIN TASK MANAGEMENT

Admin must have full control over tasks.

Admin can:

Create task

Edit task

Delete task

Pause task

Resume task

Activate task

Deactivate task

Reorder tasks

Set priority

Set start date

Set end date

Set completion limit

Set reward

Set duration

View task statistics

12. ADD TASK FORM

Admin adds a task using a YouTube URL.

Do not provide direct video upload.

Fields:

Task Title

Example:

Featured Creator Video

YouTube URL

Validate the URL.

Support common YouTube URL formats.

Reward

Admin enters a rupee amount.

Example:

₹5

System automatically converts:

₹5 → 5,000 Coins

The conversion rate must remain fixed:

₹1 = 1,000 Coins

Required Task Duration

Admin can specify the task duration where appropriate.

Completion Limit

Admin can specify:

100 completions

Once the completion limit is reached:

Automatically disable the task.

One Completion Per Wallet

Each wallet can complete the same task only once unless the admin explicitly creates a new task/campaign.

Status

Draft

Active

Paused

Completed

Expired

Schedule

Start date

End date

13. TASK LIMITS

Implement strong task-limit logic.

For each task:

Total completion limit

Completed count

Remaining count

One completion per Wallet ID

Automatic disabling after limit

Optional expiration date

Example:

Total limit: 100

Completed: 97

Remaining: 3

After 3 additional valid completions:

Task automatically becomes:

Completed / Unavailable

14. WALLET

Create a premium My Wallet section.

Display:

Current Balance

Example:

25,000 Coins

Wallet ID

Example:

WE-8F4K29X7

Total Earned

Example:

50,000 Coins

Task History

Show completed tasks.

Reward History

Show:

Task

Coins earned

Date

Status

Transactions

Show:

Credit

Reason

Amount

Timestamp

Reference

Include appropriate empty states.

15. WALLET PERSISTENCE

Wallet information must persist between visits.

Use a secure anonymous-wallet architecture.

Do not rely only on localStorage for authoritative balance.

The server/database must maintain the authoritative wallet balance.

Use a secure wallet/session token or equivalent mechanism.

17. TRANSACTION SAFETY

Never trust client-side balance calculations.

When a task is successfully completed:

Verify completion server-side.

Verify wallet eligibility.

Verify the wallet has not already completed the task.

Verify task limit has not been exceeded.

Record completion.

Credit the correct virtual coins.

Create a wallet transaction.

Update task completion count.

Disable the task if the limit is reached.

Make the reward operation atomic to prevent double-crediting.

18. ANTI-ABUSE

Implement reasonable anti-abuse protections.

Detect/prevent:

Repeated completion attempts

Duplicate task completion

Rapid repeated requests

Multiple reward requests for the same task

Invalid sessions

Tampered client requests

Negative balance

Race conditions around completion limits

Use server-side validation.

Do not rely entirely on frontend JavaScript.

19. TASK PLAYER SCREEN

Create a premium, distraction-free task screen.

Include:

Embedded content area

Task title

Reward information

Progress/completion indicator

Required task information

Completion status

Back/navigation protection while active where appropriate

Do not display unnecessary controls.

The user should clearly understand what they need to do.

20. COMPLETION SCREEN

After successful completion:

Use a polished animation.

Example:

TASK COMPLETED

+5,000 Coins

Animate the coin reward.

Then display:

Next Task

button.

Do not automatically start another task.

21. COMPLETED TASKS

Create a dedicated Completed section.

Show:

Task title

Reward

Completion date

Completion status

Completed tasks should not appear as available tasks again.

22. NAVIGATION

Create a simple professional mobile bottom navigation.

You can choose the exact structure, but it should include the most useful sections, such as:

Home

Tasks

Wallet

Completed

Do not add unnecessary navigation items.

Use icons + labels.

Highlight the active section elegantly.

23. DESIGN SYSTEM

Create a unique WATCH EARN design system.

The design must feel:

Premium

Modern

Trustworthy

Fast

Clean

Professional

Use:

Beautiful gradients

Soft shadows

Premium cards

Rounded corners

Modern typography

Subtle glass effects where appropriate

Smooth transitions

High-quality icons

Excellent spacing

Avoid:

Generic Bootstrap-looking UI

Excessive gradients

Cheap-looking colors

Overly bright backgrounds

Clutter

Huge unnecessary headings

24. ANIMATIONS

Add polished but performant animations.

Include:

Page transitions

Card entrance animations

Button press animations

Wallet balance animation

Coin credit animation

Progress animation

Task completion animation

Loading skeletons

Success states

Do not make animations slow or annoying.

25. RESPONSIVENESS

Although this is mobile-first, ensure it behaves correctly on different mobile viewport sizes.

Test:

360px
375px
390px
412px

No:

Overflow

Broken cards

Text clipping

Navigation overlap

Button clipping

Modal overflow

26. ERROR HANDLING

Create professional error states.

Examples:

Invalid YouTube URL

Please enter a valid YouTube URL.

Task unavailable

This task is no longer available.

Completion limit reached

This task has reached its completion limit.

Network error

Something went wrong. Please try again.

Reward processing

Verifying your task...

Never leave the user stuck on a blank screen.

27. LOADING STATES

Use skeleton loaders for:

Task cards

Wallet balance

Task details

Admin dashboard

Charts

Use polished loading animations.

28. ADMIN ANALYTICS

Create a professional analytics dashboard.

Charts:

Daily completions

Weekly completions

Monthly completions

Coins distributed

Task performance

Completion rate

Cards:

Active Tasks

Total Completions

Coins Distributed

Available Tasks

Completed Tasks

Keep analytics readable on a mobile screen.

30. PERFORMANCE

Optimize for mobile performance.

Use:

Lazy loading

Optimized images

Efficient database queries

Pagination where needed

Debounced actions

Proper caching

Minimal unnecessary re-renders

The site should feel fast even on average mobile internet.

31. SECURITY

Important:ty

Never expose service-role keys

Validate all server-side actions

Protect admin routes

Validate task IDs

Validate wallet IDs

Prevent duplicate reward requests

Prevent client-side balance manipulation

Sanitize user-generated task information

Use secure environment variables

32. FINAL USER EXPERIENCE

The final experience should feel like:

Open WATCH EARN

↓

See available tasks

↓

Select one

↓

Complete the independent task requirement

↓

Verification

↓

Reward animation

↓

Coins credited

↓

Next Task

↓

Wallet updates automatically

The entire experience should be smooth, fast and visually impressive.

33. FINAL QA

Before considering the application complete, test:

Viewer

First visit creates Wallet ID

Wallet persists

Task list loads

Multiple tasks display

Only one task can run at a time

Task completion works

Reward calculation works

₹1 = 1,000 Coins

Reward credits exactly once

Transaction is created

Completed task appears in Completed

Completed task cannot be completed again

Task limit works

Task automatically disables at limit

Wallet balance updates correctly

Navigation works

Mobile layouts work

Admin

Admin login works

Dashboard loads

Analytics work

Create task works

YouTube URL validation works

Reward conversion works

Edit task works

Delete task works

Pause/resume works

Completion limits work

Start/end dates work

Task statistics work

Security

Users cannot access other wallets

Users cannot modify their balance

Duplicate completion cannot generate duplicate rewards

Completion limits cannot be bypassed

Admin routes are protected

No secrets are exposed in frontend code

Quality

No console errors

No TypeScript errors

No broken buttons

No placeholder content

No broken mobile layouts

No horizontal overflow

No unfinished screens

Build the application as a complete functional product, not a static mockup.

Use Supabase for persistent data and secure server-side operations.

Make the final WATCH EARN application feel polished, premium and production-ready while keeping all rewards as virtual website coins only.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://watch-earn-quest.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/17591093-516b-482c-be44-c360cafc74cf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
