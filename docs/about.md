# Our Goals

## Why FuseML

The machine learning software domain provides an impressive collection of specialized AI/ML software libraries, frameworks, and platforms that Data Scientists, Data Engineers, and DevOps Engineers can use to coordinate and automate their activities. They have to support a wide range of services, from data extraction and exploration to model training to inference serving and monitoring. Choosing the right set of tools to suit the needs of your machine learning project isn't an easy task. To make matters worse, this set of tools you eventually decide to use might not be compatible and interoperable by default, so often there's additional work that needs to be done to have a functional and comprehensive MLOps stack attuned to your target infrastructure. What starts as a simple machine learning project eventually ends up being an inflexible DYI MLOps platform accruing a lot of technical debt and locking you into a fixed set of tools.

### Why this is still a gap

Because in the current market landscape not one single OpenSource solution or platform has been able to address this problem. MLOps are still unicorns within companies and Data Scientists are not equipped to solve the gaps mentioned above.
We are not trying to build *yet* another platform but actually tackling a narrowed problem, provide a flexible, modular, adaptable solution to remove the complexity of the daily work of the MLOps.

Wouldn't it be great if there was a software solution that could solve this complexity and simply Fuse together your favorite AI/ML tools, while at the same time being flexible enough to allow you to make changes later on without incurring massive operational costs?

### What is FuseML then?

FuseML aims to solve this and more by providing:

- An MLOps framework as the medium dynamically integrating together the AI/ML tools of your choice.
- An extensible tool built through collaboration, where Data Engineers and DevOps Engineers can come together and contribute with reusable integration code and use-cases addressing their specific needs and tools, that everyone else can benefit from.
- A set of extensible integration abstractions and conventions defined around common AI/ML concepts and implemented through tool-specific plugins and automation recipes. The abstractions are specific enough to support a complex orchestration layer to be implemented on top but at the same time flexible enough not to hide nor infringe upon the nuances of the various AI/ML tools they are wrapped around.
- An ML orchestrator combining aspects of MLOps and GitOps together into a set of services that Data Scientists, Data Engineers and DevOps Engineers can use to collaboratively manage the end-to-end lifecycle of their AI/ML projects, from code to production, across infrastructure domains.

What FuseML is NOT:

- An opinionated open source MLOps platform. Flexibility and extensibility are FuseML's core principles. Instead of being a set of tightly integrated components, it relies on extension mechanisms and custom automation recipes to dynamically and loosely integrate the 3rd party AI/ML tools of your choice.
- A complete lifecycle manager. FuseML's flexibility does come with a cost, which is vital to reduce complexity: managing the complete lifecycle (installation and upgrade processes) of supported 3rd party AI/ML tools is out of scope. However, FuseML will provide registration and auto-detection mechanisms for existing 3rd party tool installations, and may even go so far as to add lifecycle management to its list of supported extension mechanisms.

### FuseML Principles

- **Flexibility** - create and manage dynamic MLOps workflows connecting different AI/ML tools across multiple infrastructure domains
- **Extensibility** - leverage FuseML's set of abstractions and extension mechanisms to add support for your favorite AI/ML tools
- **Composability** - build complex MLOps workflows for your projects out of composable building blocks implementing a wide range of machine learning functions
- **Collaborative** - use MLOps automation and tool integration recipes created in collaboration by all AI/ML team roles - Data Scientists, Data Engineers, and DevOps Engineers
- **GitOps for Machine Learning** - extend what traditional GitOps does with code to all other types of artifacts specific to machine learning - models and datasets, as well as other byproducts of a DevOps workflow (e.g. packages, container images) to provide features such end-to-end versioning, tracking and reproducibility.
