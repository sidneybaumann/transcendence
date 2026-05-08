_This project has been created as part of the 42 curriculum by gebuqaj (Gentian), sbaumann (Sidney), ldelahay (Luca)_

# FT_TRANSCENDENCE - Snake42 app

## DESCRIPTION

Transcendence is a group project intended to boost our creativity, self-confidence, adaptability to new technologies, and teamwork skills. 

We created a real-world web application entitled `Snake42`, our take on the classic Snake game (originally called Blockade).  

The app combines gameplay, authentication, and security features such as OAuth, Two-Factor Authentication, and GDPR-compliant user management. Metrics and log management were also implemented through ELK and Grafana/Prometheus. 

It was our design to separate the game from security. In that sense, creating a user account doesn't bring any added value in our app. It's only purpose is to implement modules of interest to us. 


## INSTRUCTIONS 

### Production (Evaluation)
#### Prerequisites
- Docker and Docker Compose installed on your machine.
- A `.env.prod` file provided by the developers.

#### Steps
1. Clone the repository and navigate to the project directory.
2. Place the `.env.prod` file provided by the developers in the project root.
3. Run `hostname`, then add that hostname to the site host list of 'Caddyfile' (line 11). 
4. Run `make prod-up` to start the production.
5. Wait for the services to start. Enter `https://localhost:8443` in your Google Chrome browser. You will see a warning about the self-signed certificate, click on "Advanced" and then "Proceed to localhost (unsafe)". You can now access the website.
6. For remote access in the same Wifi network, replace `localhost` with the hostname of the machine running the stack. For example, if the hostname is `c3r4s3.42lausanne.ch`, ON THE OTHER COMPUTER in the same wifi network, enter `https://c3r4s3.42lausanne.ch:8443` in the browser. You will see the same warning about the self-signed certificate, click on "Advanced" and then "Proceed to c3r4s3 (unsafe)". You can now access the website. If you are on Firefox, you will have to import the self-signed certificate of Caddy manually. Copy the certificate file from the Caddy volume of the host, send it to the other computer, and import it in 'manage certificates' of Firefox privacy settings.

- https://localhost:8443 to enter website
- https://localhost:3001 to enter grafana
- https://localhost:5601 to enter kibana
- https://localhost:3000/documentation to enter API documentation (Swagger)
- run `make studio-up` and go to http://localhost:5555 to view the database schema through Prisma Studio.

DO NOT run production at the same time as development, they use the same volumes name and network name and this will cause issues. Run `make destroy-prod` to delete the production stack (Docker images are not deleted).

### Development
#### Prerequisites
- Docker.
- VSCode with DevContainer extension.
- A `.env` file provided by the developers.

#### Steps
1. Clone the repository and navigate to the project directory.
2. Move the local `.env` file provided by the developers to the root of the project.
3. Open the project in VSCode and open the DevContainer.
4. Run `pnpm run dev` to start the application or `pnpm run dev-all` to open Mailpit, Swagger and Prisma in one go.

- http://localhost:5173 to enter website
- http://localhost:8025 to enter Mailpit
- http://localhost:3000/documentation to enter API documentation (Swagger)
- In backend folder, run `pnpm prisma studio` and enter `http://localhost:51212` to enter Prisma Studio.
- On the host (not inside the DevContainer), run `make monitor` to start the monitoring stack. Enter `https://localhost:3001` in your browser to access Grafana.
- On the host (not inside the DevContainer), run `pnpm dev-elk` to start ELK for log management. Enter `https://localhost:5601` in your browser to access Kibana.

5. Run `make destroy-dev` to delete the development stack (Docker images are not deleted).


## TEAM INFORMATION

The roles here below were assigned although, truth be told, we all shared those roles one way or another. Being only three, we all had to handle bits and parts of most of the project which means we all have a relatively good understanding of it as a whole.

**Project Owner, Developer:** Sidney - Led most of the meetings, app security  
**Project Manager, Developer:** Luca - Organised meeting times, place, booking  
**Technical Lead, Developer:** Gentian - Handled most of the technical part of the project (Docker, Makefile, Prod)  

## PROJECT MANAGEMENT

We set up **weekly meetings** at Bibliothèque cantonale et universitaire (BCU) where we booked a room equipped with a whiteboard and a TV screen.
The meetings were structured in a way that we would first check what was achieved over the past week. We would then each explain, in turn, what we had implemented and then discuss what needed to be done over the following week.

Whenever necessary, **second meetings** would be organised later in the week with concerned parties.

A **documentation webpage** was set up at [https://docs.sidneybaumann.dev](https://docs.sidneybaumann.dev) so that all registered team members can safely access documentation related to the project.

To organise our tasks, we mainly used **GitHub Issues** or our own system to keep up with our own progress. Sidney, for instance, used a Timeline on the documentation page.

Our communication channels were **Discord** and **Whatsapp** to make it easy to share docs and questions in a centralised way.

## TECHNICAL STACK

◦ Development was made in a DevContainer  
◦ Pnpm as packet manager  
◦ Frontend technologies: Vite, React, Typescript, TailwindCSS  
◦ Backend technologies: Fastify, Prisma ORM, Swagger  
◦ Database system : We chose PostgreSQL because it is a real database server that integrates well with Prisma. Since our architecture is containerized, a separate database service is more appropriate than a file-based solution like SQLite. PostgreSQL supports concurrency, strong data integrity, and security, which are essential for a multi-user application. Additionally, it is widely used in production, which ensures reliability and good ecosystem support.  
◦ Various libraries were used for security modules, such as Argon2, google-auth-library, fastify/jwt, and so on.  

We based ourselves on the previous project we worked on but wanted to "simplify" the process and use different technologies, mainly React, or pnpm instead of npm.


## DATABASE SCHEMA

Our database can be viewed through **Prisma Studio**. Start the production stack, run `make studio-up` and go to http://localhost:5555.  
If you don't want to start the whole stack, you can view the schema in the `backend/prisma/schema.prisma` file.

## FEATURES LIST

### sbaumann

**UX**  
◦ **Navigation logic** using React Router and Protected/Guest routes in the frontend.  
◦ **Auth context** propagated throughout app for realtime authentication detection.

**Security**  
◦ Registration with **email verification**.  
◦ Login with **2FA** when enabled.  
◦ Possibility to reset password, change username, change email, change password.  
◦ Enabling 2FA with recovery codes valid on login and disable 2FA.  
◦ **Google OAuth**. Linking to existing email.  
◦ **Anonymisation** of account, exporting user data.  

**Email**  
◦ Email service through **Resend** with Cloudflare DNS (Mailpit in dev).  
◦ **Email notifications** system for account "deletion", email change, password reset, and so on.  

### gebuqaj
◦ The game (see Doc/GameDoc.md).  
◦ Monitoring system (see Doc/Prometheus-Grafana.md).

### ldelahay  

**Game & AI**  
◦ Development of an AI opponent with decision-making logic to navigate the environment and avoid collisions.  
◦ Optimization of AI behavior to balance performance and difficulty, and human like behaviour.

**Observability (ELK)**  
◦ Implementation of the ELK stack (Elasticsearch, Logstash, Kibana) for centralized logging.  
◦ Configuration of log pipelines to collect and process backend logs.  
◦ Setup of Kibana dashboards to visualize and analyze application activity in real time.  
◦ Integration with Docker for a clean and reproducible deployment of the observability system. (mostly scripting bash)


## MODULES

◦ List of all chosen modules (Major and Minor).  
◦ Point calculation (Major = 2pts, Minor = 1pt).  

| What                     | Which              | Who                     | Type  | Points   |
| ------------------------ | ------------------ | ----------------------- | ----- | -------- |
| BASE ARCHITECTURE        |                    | All members contributed |       |          |
| - Frontend framework     | React              | Sidney + Luca           | Minor | 1 pt     |
| - Backend framework      | Fastify            | Gentian                 | Minor | 1 pt     |
| - ORM for database       | Prisma             | Gentian                 | Minor | 1 pt     |
| GAME                     |                    |                         |       |          |
| - Web-based game         | Snake              | Gentian                 | Major | 2 pts    |
| - Game customization     |                    | Gentian                 | Minor | 1 pt     |
| - Multiplayer            |                    | Gentian                 | Major | 2 pts    |
| - AI opponent            |                    | Luca                    | Major | 2 pts    |
| SECURITY & PRIVACY       |                    |                         |       |          |
| - Complete 2FA system    |                    | Sidney                  | Minor | 1 pt     |
| - Remote Authentication  | Google OAuth       | Sidney                  | Minor | 1 pt     |
| - GDPR compliance        |                    | Sidney                  | Minor | 1 pt     |
| - Notification system    |                    | Sidney                  | Minor | 1 pt     |
| DIVERS                   |                    |                         |       |          |
| - Prometheus-Grafana     |                    | Gentian                 | Major | 2 pts    |
| - ELK                    |                    | Luca                    | Major | 2 pts    |
| - Support add. browsers  |                    | Luca                    | Major | 1 pt     |
| Total points             |                    |                         |       | 19 pts   |

## INDIVIDUAL CONTRIBUTIONS

We all played a significant part in the designing the main structure of the project.

### sbaumann
- Created a **documentation page** online using mkdocs and linked it to my domain sidneybaumann.dev using cloudflare dns service and security features so that only registered members can access it.
- I put together the **scaffold of the project** from scratch to learn how it is done using pnpm and designing a backend/frontend separation.
- Luca and I started working on the **frontend**. I initially worked on the login page, the **navigation** and **routing**, and the main structure.
- Since I would like to build a career in cybersecurity, I chose security-related modules.
- As i implemented **OAuth with Google, 2FA and GDPR**, I had to work both in the frontend and the backend handling backend logic with Fastify and Prisma and frontend logic with React. I also applied 2fa authentication on all sensitive routes/actions.
- For the user experience (UX) to make sense, I implemented **email notifications** for important actions such as changing email or password, to verify one's email or to reset one's password using tokens.
- For **GDPR** I mainly made sure users could access and edit their data, export it as well as anonymise their account.

Working on the security part of the project taught me a lot. It was really hard to put logical processes in place as everytime a feature would be in place I'd realise there was other things I also had to take into account and the list seemed never-ending. If time permitted it, I would also have implemented PKCE for Google OAuth, unlinking a Google Account, setting a password, added a modal to warn before account deletion, and so on.

### gebuqaj
- Initialized the backend structure and implemented the base of the server. This includes setting up Fastify, Prisma, Swagger, Docker and creating initial API endpoints (augmented later by Sidney):
  - /api/users/login
  - /api/users/register
  - /api/users/logout
Doc: backend-overview.md, Project_Initialization_Backend_Update.md, Route1-register.md, Route2-login.md, Route3-logout.md

- Implemented the Game using Canvas API and game menu using React. This includes multiplayer and game customization features.  
Doc: GameDoc.md

- Implemented monitoring system using Prometheus and Grafana. Set up Prometheus to scrape metrics from the Fastify server and configured Grafana dashboards to visualize the metrics.  
Doc: Old_Prometheus-Grafana.md, Prometheus-Grafana.md

- Implemented the Docker configuration for production deployment with Caddy as a reverse proxy and building the production image with a Dockerfile.  
Doc: Deployment.md


### ldelahay
- Worked on the frontend development alongside Sidney, contributing to the overall structure and consistency of the user interface using React and TailwindCSS. I focused on making the UI responsive, coherent and user-friendly across different pages.

- Developed and refined the AI opponent for the Snake game. This included designing decision-making logic, handling movement constraints, and improving the behavior to make it both challenging and efficient.

- Participated in debugging and improving both frontend and backend interactions, especially for real-time features and API communication.

- Helped improve overall code quality and project structure, making sure components were reusable and the codebase remained clean and maintainable.

- I implemented the ELK stack (Elasticsearch, Logstash, Kibana) to provide centralized logging and monitoring for the application.


## RESOURCES

## sbaumann

### COURSES

- React - https://egghead.io/courses/the-beginner-s-guide-to-react
- Code with Mosh course (React, Javascript, Typescript) - https://codewithmosh.com/p/the-ultimate-full-stack-javascript-developer-bundle-2024-edition
- w3schools - https://www.w3schools.com

### YOUTUBE CHANNELS

- Fireship series
- Programming with Mosh
- Web Dev Simplified
- Traversy Media
- TomDoes Tech

### OFFICIAL WEBSITES

- Fastify - https://fastify.dev/
- Prisma - https://www.prisma.io/
- React - https://react.dev/
- React router - https://reactrouter.com/
- TypeScript - https://www.typescriptlang.org/
- Zod - https://zod.dev/
- Vite - https://vite.dev/
- TailwindCSS - https://tailwindcss.com/
- Swagger - https://swagger.io
- Caddy - https://caddyserver.com

### RESOURCES FOR SECURITY

RFCs
- 7519 	JWT				  - https://www.rfc-editor.org/rfc/rfc7519
- 6238 	TOTP			  - https://www.rfc-editor.org/rfc/rfc6238
- 6749	OAuth 2.0		- https://www.rfc-editor.org/rfc/rfc6749

OWASP cheatsheets
- OWASP Authentication Cheat Sheet - https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet - https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Cryptographic Storage Cheat Sheet - https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
- OWASP MFA Cheat Sheet - https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html

Libraries
- crypto (node.js module)	- https://nodejs.org/api/crypto.html
- argon2 - https://github.com/P-H-C/phc-winner-argon2
- google-auth-library - https://github.com/googleapis/google-auth-library-nodejs
- otpauth - https://github.com/hectorm/otpauth
- rate-limit - https://github.com/fastify/fastify-rate-limit

GDPR
- https://gdpr.eu/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/
- https://commission.europa.eu/law/law-topic/data-protection_en
- https://www.edpb.europa.eu/edpb_en

## gebuqaj

Typescript:
- https://w3school.com
- https://codewars.com

Fastify:
- https://www.youtube.com/watch?v=LMoMHP44-xM
- https://fastify.dev/docs/
- https://thatarif.in/posts/token-based-authentication-with-fastify-jwt/

Prisma:
- https://www.youtube.com/watch?v=7L0U-j-SZjM&t=1935s
- https://www.youtube.com/watch?v=RebA5J-rlwg&t=186s
- https://www.prisma.io/docs/

zod:
- https://www.youtube.com/watch?v=L6BE-U3oy80
- https://zod.dev/

DevContainer:
- https://code.visualstudio.com/docs/devcontainers/create-dev-container
- https://containers.dev/implementors/json_reference/

CanvasHTML:
- https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial

React:
- https://react.dev

PostgreSQL:
- https://hub.docker.com/_/postgres

Prometheus-Grafana:
- https://github.com/SkeLLLa/fastify-metrics?tab=readme-ov-file
- https://github.com/siimon/prom-client
- https://prometheus.io/docs/introduction/overview/
- https://grafana.com/docs/grafana/latest/
- https://github.com/prometheus/alertmanager
- https://hub.docker.com/r/prometheuscommunity/postgres-exporter

Caddy:
- https://caddyserver.com/docs/caddyfile

### ldelahay

JavaScript:
- https://www.w3schools.com/js/
- https://codewithmosh.com/p/javascript-basics-for-beginners

TypeScript:
- https://www.typescriptlang.org/
- https://www.youtube.com/playlist?list=PL4cUxeGkcC9gUgr39Q_yD6v-bSyMwKPUI


HTML:
- https://www.youtube.com/watch?v=hu-q2zYwEYs&list=PL4cUxeGkcC9ivBf_eKCPIAYXWzLlPAm6G&index=1
- https://www.w3schools.com/html/

CSS/TailwindCSS:
- https://www.youtube.com/watch?v=hu-q2zYwEYs&list=PL4cUxeGkcC9ivBf_eKCPIAYXWzLlPAm6G&index=1
- https://www.youtube.com/playlist?list=PL4cUxeGkcC9gpXORlEHjc5bgnIi5HEGhw

React:
- https://react.dev/learn
- https://legacy.reactjs.org/docs/getting-started.html
- https://codewithmosh.com/p/ultimate-react-part1


Frontend:
- https://vite.dev/guide/
- https://zod.dev/
- https://www.youtube.com/watch?v=L6BE-U3oy80
- https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms
- https://react.dev/reference/react-dom/components/input
- https://reactrouter.com/en/main

Elasticsearch:
- https://www.elastic.co/elasticsearch
- https://www.elastic.co/docs
- https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-docker

Logstash:
- https://www.elastic.co/logstash
- https://www.elastic.co/docs/reference/logstash/getting-started-with-logstash
- https://www.elastic.co/guide/en/logstash/current/index.html

Kibana:
- https://www.elastic.co/kibana
- https://www.elastic.co/docs/explore-analyze

Filebeat (Not used):
- https://www.elastic.co/beats/filebeat
- https://www.elastic.co/docs/reference/beats/filebeat
- https://www.elastic.co/guide/en/beats/filebeat/current/index.html
- https://www.elastic.co/docs/reference/beats/filebeat/running-on-docker

IA_Opponent:
- https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial
- https://www.redblobgames.com/pathfinding/a-star/introduction.html
- https://en.wikipedia.org/wiki/A*_search_algorithm

DevContainer:
- https://code.visualstudio.com/docs/devcontainers/create-dev-container
- https://containers.dev/
- https://containers.dev/implementors/json_reference/

## **How AI was used**

### sbaumann
I mainly used AI for: 
- repetitive tasks
- to structure my logic
- to get some hints and recommendations for resources
- for debugging when stuck
- to learn and solidify my understanding

### gebuqaj
Copilot and/or Gemini:
- Helped me learning and understanding new technologies.
- Review all my code and all pull requests.
- Wrote:
  - The function 'drawArrow' of 'Snake.ts'. It draws an arrow, indicating the direction of a Snake during the countdown.
  - /scripts/init_ro_user.sh, which creates a read-only user for the SQL database.
  - 80% of the text of the doc I submitted here.
- Helped writing:
  - PromQL queries for grafana panels and for alerting rules
  - Play.tsx
  - Dockerfile

### ldelahay
ChatGPT, and Copilot for PR review.
I used AI as a practical assistant throughout the project, mainly for repetitive or time-consuming tasks such as code restructuring, and debugging. It also helped me clarify concepts, explore different implementation approaches, and discover relevant documentation or resources.

<!-- # ft_transcendence

Transcendence is a group project, where we create a real-world web application. We chose to create a 1v1 snake game.

# dev documentation

https://docs.sidneybaumann.dev -->
