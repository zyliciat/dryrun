# dryrun
Alicia Teo | github pages url: https://zyliciat.github.io/dryrun/

### Contents
1. [Overview](#1-overview)
2. [Design Process](#2-design-process)
3. [Features](#3-features)
4. [Technologies Used & Technical Decisions](#4-technologies-used--technical-decisions)
5. [Testing](#5-testing)
6. [Credits](#6-credits)

## 1: Overview
### Problem statement: 
Singapore tends to have quite unpredictable weather and there are many things to look out for: rain, thunder, UV, heat and sometimes even haze. Singapore also has a tendency for two regions to have vastly differing weather conditions. NEA's weather forecast metrics also tend to be distributed across the NEA site and I need to search for them separately. 

As I gear up for my half marathon, it causes a lot of uncertainty and impacts my plans quite often as I tend to run in the opposite end of SG from where I live.

### Objective: 
I created this website for
1. let's be real - it is for a programming assignment
2. but also wanted to create an website that I myself could use when going for runs, to check weather conditions for the particular area I'm running consolidating the stats that I want to see. 

**Target Audience:** runners or park users in general 

## 2: Design Process
### Some user stories
|User Story|Prioritisation|
|----------|--------------|
|As a runner, I want to see key metrics like UV, weather(rainy/sunny/thunder/lightning), haze, rainfall levels for a park I am interested in | High |
|As a runner, I want to be able to be able to compare between the parks to be able to decide which park I should go to or not | High |
|As a runner, I would like to be able to provide thresholds to customise the park scoring to my own comfort levels | Medium |
| Future-state: As a runner, I would like a way to observe trends to understand how a weather condition is changing in real time | Medium |

### UI design process

Figma wireframe design process: https://www.figma.com/design/Tfalmy9SYrz2bxKi7cQABj/dryrun-UI?node-id=0-1&t=K0Jpfpf6H3ypfnee-1

**Key things included in initial UI design**
- colour scheme, typography
- logos or any other components
- overall layout and placement of key components, with place holder for dynamic components first

## 3: Features
1. Upon page load/reload, the site pulls for each park the corresponding latest information for the various metrics and consolidates it to be shown on a card.
2. The cards for each park's weather information is classified based on Good, OK, Not Good or Bad, based on certain thresholds. 
3. On first page load, it is classified based on a default setting. However, the user can choose to change the threshold settings to reflect their comfort level and the classifications will be reflected accordingly.

## 4: Technologies Used & Technical Decisions

### Technologies used: 
- **HTML 5** for webpage structures
- **CSS** for styling
- **JS** for fetching data, classifications and manipulating outputs to be passed back to the html and reflected on the frontend
- **data.gov environment related APIs** for weather real-time related data
- **Figma** for initial UI wireframe design
- **google fonts** for import of the host grotesk font
- **github** for CI/CD and website deployment to github pages

### Technical Decisions

| Category | Decision | Remarks |
|----------|----------|---------|
| Data | Store all parks in one list with area, region and coordinates | Each API identifies location differently. A new park only needs one new entry. |
| Data | Use the nearest station for rainfall and WBGT, area for forecast and region for PSI | Matches how each dataset is reported. Nearest means straight-line distance from the park's midpoint, which may not represent a long route. UV is one value for all of Singapore, so it does not help compare parks. |
| API handling | Call all five APIs together using `Promise.all` | Faster than calling them one by one. The trade-off is that if one fails, no cards are shown, only an error message. |
| API handling | Wait 5 seconds and retry up to 3 times on "too many requests" (429) | Handles rate limits without the user having to reload. Other errors are not retried. |
| Classification | Give each park the worst category that any reading reaches | One serious hazard should not be hidden by other good readings. |
| Classification | Classify a park no better than "Not Good" if rainfall or forecast is missing | Avoids telling users it is fine to run without that information. This does not yet cover PSI, UV or WBGT. |
| Classification | Show what caused the status on each card that is not "Good" | Helps users judge for themselves whether the issue matters to them. |
| User settings | Save custom thresholds in local storage, with a reset button | Settings are kept between visits without needing accounts or a server, but only on that browser. |
| User settings | Only save thresholds that increase from OK to Bad | Prevents settings that would not make sense. |
| Performance | Keep the latest readings in memory | Changing thresholds redraws the cards without calling the APIs again. Reloading the page fetches new readings. |
| Accessibility | Turn off the logo animation for users who prefer reduced motion | Moving elements can be uncomfortable for some users. |
| Accessibility | Give each threshold box its own label | Screen readers can tell the boxes in the table apart. |

## 5: Testing

|Test Case | Resolution |
|----------|------------|
| Weather should show when the page opens | Readings first loaded only after clicking a button. The code now fetches them as soon as the page opens. |
| Weather should still load if the API is busy ("too many requests") | The code waits 5 seconds and tries again, up to 3 times. |
| Cards should only show after all data has arrived (`async`/`await`) | The page shows "Loading..." while `Promise.all` waits for all five API calls, then builds the cards. |
| Errors from API calls should be caught (`try...catch`) | A failed request is logged to the console and passed on to the main function, which shows "Couldn't get the weather. Please try again." |
| A park with no rainfall or forecast reading should not look safe to run | The code rates the park "Not Good" or worse, even if its other readings are fine. |
| User should know why a park is not rated "Good" | Each of these cards has an "Issue" line naming the cause, such as UV or rainfall. |
| Thresholds entered in the wrong order should be rejected | Values must increase from OK to Bad. Otherwise nothing is saved and a message explains why. |
| Custom thresholds should remain after reloading the page | They are saved in the browser's local storage. The reset button removes them and restores the defaults. |
| A park with no PSI, UV or WBGT reading should not look safe to run | Open: only missing rainfall and forecast are checked. The same check is needed for these three readings. |
| Page should fit a mobile screen | Open: the cards wrap, but the rest of the layout has not been adjusted for small screens. |

## 6: Credits
| Reference | Purpose |
|--------|-----|
| [data.gov Environment Related APIs](https://data.gov.sg/datasets?formats=API&topics=environment) | NEA APIs |
| [BEgg Website](https://www.b-egg.farm/) | Interesting website that was used for UI, styling inspiration |

I also have to acknowledge the use of AI to assist with coding, documentation and generation of logos, graphics, park information etc.
