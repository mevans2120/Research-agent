# Product Context

This file provides a high-level overview of the project and the expected product that will be created. Initially it is based upon projectBrief.md (if provided) and all other available project-related information in the working directory. This file is intended to be updated as the project evolves, and should be used to inform all other modes of the project's goals and context.
2025-06-20 13:52:17 - Initial Memory Bank creation for research agent project.

## Project Goal

* Research Agent Application: A Next.js-based web application that provides intelligent research capabilities
* Currently includes API endpoints for research functionality with sub-question generation and synthesis
* Appears to be designed as a proof of concept for automated research tools, specifically targeting insurance plan analysis

## Key Features

* Research API endpoint that generates sub-questions and conducts comprehensive research
* Web interface built with Next.js and React
* Real-time research processing with detailed logging
* Focus on insurance industry research capabilities (based on terminal output showing Aetna insurance plan research)

## Overall Architecture

* Next.js 15+ application with TypeScript
* API routes for research functionality (`/api/research`)
* Frontend components for user interaction
* Development server running on standard Next.js configuration
* Environment configuration with `.env.local` for API keys and settings