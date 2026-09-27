CHANGE UK WEBSITE V3
====================
GitHub Pages + Supabase

V3 adds a much larger working Member Hub and a larger private Control Room.

WHAT IS NEW
-----------
MEMBER HUB
- Private member announcements
- Pinned private announcement area
- Upcoming events
- RSVP Going / Can't attend
- Adult-only / Youth-only / All-member visibility
- Policy briefings with expandable full text
- Member resource library
- Six downloadable Change UK logo variants
- Ideas & feedback inbox
- Previous feedback/status history
- My Membership account page
- Overview dashboard with live counts and quick actions

CONTROL ROOM
- Manage representation figures and homepage notice
- Manifesto + policy quiz editor
- Public news publisher
- Private member announcements
- Events manager, including member-only/public switch
- Policy briefing publisher
- Resource library publisher
- Member feedback review/close controls

PUBLIC SITE
- Public Events section
- Only events marked member_only = false appear publicly
- Member-only events remain protected inside the Member Hub

LOGO FILES
----------
logo.png             Original uploaded logo
logo-primary.png     Original full artwork copy
logo-banner.png      Tighter horizontal crop
logo-mark.png        Symbol/Union-style mark
logo-wordmark.png    Change UK name block
logo-white.png       White transparent treatment for dark backgrounds
logo-slogan.png      Slogan strip

INSTALL / UPGRADE
-----------------
1. Upload ALL files from this ZIP to the ROOT of your GitHub repository.
2. Keep your existing config.js values if Supabase is already configured.
3. Open Supabase > SQL Editor.
4. Run the NEW V3 supabase.sql.
   - It is designed to be rerunnable.
   - It preserves the existing core website tables.
   - It creates the new member tables and RLS policies.
5. Sign in through member.html to use the Member Hub.
6. Sign in through control.html with an account that already has is_admin = true.

IMPORTANT SECURITY
------------------
- control.html being unlinked is NOT the security boundary.
- Supabase authentication + Row Level Security are the security boundary.
- Do not put a Supabase service-role key in config.js or GitHub.
- config.js should contain only the public project URL and anon/publishable key.
- V3 does not automatically promote any email to admin.

NEW SUPABASE TABLES
-------------------
member_announcements
events
event_rsvps
policy_briefings
member_resources
member_feedback

AUDIENCE VALUES
---------------
all
adult
youth

EVENT TYPES
-----------
Events can be any category you type, for example:
Member Q&A
Policy briefing
Youth session
Conference
Local meeting
Online event

To make an event public, untick "Member only" in the Control Room.
