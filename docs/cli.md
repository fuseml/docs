# FuseML Command-Line Reference

Using the FuseML CLI is a frictionless experience. Let's deep dive into the various options you may use with it.
Let's start looking at the global capabilities. Simply type:

```bash
fuseml
```

you should get a similar output

```bash
FuseML command line client

Usage:
  fuseml [command]

Available Commands:
  application application management
  codeset     codeset management
  extension   Extension management
  help        Help about any command
  project     Project management
  runnable    runnable management
  version     display version information
  workflow    Workflow management

Flags:
  -h, --help          help for fuseml
      --timeout int   (FUSEML_HTTP_TIMEOUT) maximum number of seconds to wait for response (default 30)
  -u, --url string    (FUSEML_SERVER_URL) URL where the FuseML service is running
  -v, --verbose       (FUSEML_VERBOSE) print verbose information, such as HTTP request and response details

Use "fuseml [command] --help" for more information about a command.
```

Most CLI commands require you to supply the URL where the FuseML instance is running, either as a command line argument,
or as the FUSEML_SERVER_URL environment variable. The URL is printed out by the installer during the installation process.
If you missed it, you can retrieve it at  any time with the following command:

```bash
export FUSEML_SERVER_URL=http://$(kubectl get VirtualService -n fuseml-core fuseml-core -o jsonpath="{.spec.hosts[0]}")
```

## Codesets

A FuseML Codeset represents a versioned collection of files - code files, scripts, configuration files, generally all the sources needed to implement, build and execute the machine learning logic. The codeset is the "link" between your local environment and the Git-a-like repository where you and your team are working. Use the CLI to publish your ML code to the remote FuseML orchestrator instance and later on assign it to compatible automation workflows.

The codeset sub-command has the following capabilities:

```bash
> fuseml codeset --help
Perform operations on codesets

Usage:
  fuseml codeset [command]

Available Commands:
  delete      Delete codesets.
  get         Get codesets.
  list        List codesets.
  register    Register codesets.
  set         Set current codeset.

Flags:
  -h, --help   help for codeset

Global Flags:
      --timeout int   (FUSEML_HTTP_TIMEOUT) maximum number of seconds to wait for response (default 30)
  -u, --url string    (FUSEML_SERVER_URL) URL where the FuseML service is running
  -v, --verbose       (FUSEML_VERBOSE) print verbose information, such as HTTP request and response details

Use "fuseml codeset [command] --help" for more information about a command.
```

## Extensions

The way FuseML integrates with 3rd party AI/ML tools is through extensions. External tools can be registered as
FuseML extensions and then later on referenced in workflows. Extensions provide the means to manage how FuseML
has access to external AI/ML tools, such as data stores, model stores and generic storage services, as well as
prediction serving services and other specialized AI/ML services. Decoupling external tools from workflows also
allows users to configure reusable workflows and thus avoid being locked into a particular AI/ML tool stack.

3rd party tools that can be installed through the FuseML installer, such as MLFlow and KFServing, are automatically
registered as FuseML extensions. The FuseML CLI can be used to manage additional extensions, such as registering
AI/ML tools that are not managed by FuseML as FuseML extensions.

The extension sub-command has the following capabilities:

```bash
> fuseml extension --help
Perform operations on extensions

Usage:
  fuseml extension [command]

Available Commands:
  credentials Extension credentials management
  delete      Deletes an extension
  endpoint    Extension endpoint management
  get         Get an extension
  list        Lists one or more extensions
  register    Registers a FuseML extension
  service     Extension service management
  update      Update the attributes of an existing FuseML extension

Flags:
  -h, --help   help for extension

Global Flags:
      --timeout int   (FUSEML_HTTP_TIMEOUT) maximum number of seconds to wait for response (default 30)
  -u, --url string    (FUSEML_SERVER_URL) URL where the FuseML service is running
  -v, --verbose       (FUSEML_VERBOSE) print verbose information, such as HTTP request and response details

Use "fuseml extension [command] --help" for more information about a command.
```

There are essentially two ways to register extensions with the FuseML CLI: either by supplying a YAML file with
the complete extension descriptor using `fuseml extension register -f <descriptor-file>`, or by building the extension
piece by piece using the `fuseml extension register`, `fuseml extension service add`, `fuseml extension endpoint add`
and `fuseml extension credentials add` commands and their command-line arguments.

The following example YAML file describes an external MLFlow tracking server instance that is
registered as an experiment tracking and model store extension with FuseML:

```yaml
id: mymlflow
product: mlflow
version: "1.19.0"
description: MLFlow experiment tracking service
zone: dev-server
services:
  - id: mlflow-tracking
    resource: mlflow-tracking
    category: experiment-tracking
    description: MLFlow experiment tracking service API and UI
    auth_required: False
    endpoints:
      - url: http://10.20.30.40
        type: external
        configuration:
          MLFLOW_TRACKING_URI: http://10.20.30.40
  - id: mlflow-store
    resource: s3
    category: model-store
    description: MLFlow minio S3 storage back-end
    auth_required: True
    credentials:
      - id: default
        scope: global
        configuration:
          AWS_ACCESS_KEY_ID: v4Us74XUtkuEGd10yS05
          AWS_SECRET_ACCESS_KEY: MJtLeytp72bpnq2XtSqpRTlB3MXTV8Am5ASjED4x
    endpoints:
      - url: http://10.20.30.40:9000
        type: external
        configuration:
          MLFLOW_S3_ENDPOINT_URL: http://10.20.30.40:9000
```

To register the extension as a YAML file with the FuseML CLI:

```
> fuseml extension register -f mymlflow.yaml 
Extension "mymlflow" successfully registered
```

Alternatively, to build the same extension step by step:

```
> fuseml extension register --id mymlflow -p mlflow --version 1.19.0 --zone dev-server --desc "MLFlow experiment tracking service"
Extension "mymlflow" successfully registered

> fuseml extension service add --id mlflow-tracking -r mlflow-tracking -c experiment-tracking --desc "MLFlow experiment tracking service API and UI" mymlflow
Service "mlflow-tracking" successfully added to extension "mymlflow"

> fuseml extension service add --id mlflow-store -r s3 -c model-store --auth-required --desc "MLFlow minio S3 storage back-end" mymlflow
Service "mlflow-store" successfully added to extension "mymlflow"

> fuseml extension endpoint add -c MLFLOW_TRACKING_URI:http://10.20.30.40 mymlflow mlflow-tracking http://10.20.30.40
Endpoint "http://10.20.30.40" successfully added to service mlflow-tracking from extension "mymlflow"

> fuseml extension endpoint add -c MLFLOW_S3_ENDPOINT_URL:http://10.20.30.40:9000 mymlflow mlflow-store http://10.20.30.40:9000
Endpoint "http://10.20.30.40:9000" successfully added to service mlflow-store from extension "mymlflow"

> fuseml extension credentials add --id default -c AWS_ACCESS_KEY_ID:v4Us74XUtkuEGd10yS05,AWS_SECRET_ACCESS_KEY:MJtLeytp72bpnq2XtSqpRTlB3MXTV8Am5ASjED4x mymlflow mlflow-store
Credentials "default" successfully added to service mlflow-store from extension "mymlflow"
```

## Workflows

Workflows are the most important feature of FuseML. Configuring workflows is a declarative way of instructing FuseML
to run automated operations using codesets and other types of artifacts as input and deploying applications as output.
A workflow can be represented by something as simple as a single operation (step), or it can describe a complex, end-to-end
ML pipeline that builds your code, runs it to train a machine learning model and ultimately serves the model
using a prediction service.

Getting a workflow to execute is basically a two step process:

- first, configure a workflow definition from a yaml or json file. Consult the [API Refefence](api.md) section for a
full description of the workflow format.
- then, use the command line to assign a codeset to the workflow. The workflow is automatically triggered as a result of the
assignment, as well as every time a new version of the assigned codeset is published. The status, as well as the results(s)
of a workflow run can be displayed with the CLI.

The workflow sub-command has the following capabilities:

```bash
> fuseml workflow --help
Perform operations on workflows

Usage:
  fuseml workflow [command]

Available Commands:
  assign           Assigns a workflow to a codeset
  create           Creates a workflow
  delete           Deletes a workflow
  get              Get a workflow
  list             Lists one or more workflows
  list-assignments Lists one or more workflow assignments
  list-runs        Lists one or more workflow runs
  unassign         Unassign a workflow from a codeset

Flags:
  -h, --help   help for workflow

Global Flags:
      --timeout int   (FUSEML_HTTP_TIMEOUT) maximum number of seconds to wait for response (default 30)
  -u, --url string    (FUSEML_SERVER_URL) URL where the FuseML service is running
  -v, --verbose       (FUSEML_VERBOSE) print verbose information, such as HTTP request and response details

Use "fuseml workflow [command] --help" for more information about a command.
```

Following is an example of workflow definition in YAML format describing an end-to-end ML pipeline.
It assumes that both MLFlow and KFServing have already been installed and registered with FuseML as
extensions, as covered in the [tutorial](tutorials/kfserving-basic.md) section:

```yml
name: example
description: |
  End-to-end pipeline template that takes in an MLFlow compatible codeset,
  runs the MLFlow project to train a model, then creates a KFServing prediction
  service that can be used to run predictions against the model."
inputs:
  - name: mlflow-codeset
    description: an MLFlow compatible codeset
    type: codeset
  - name: predictor
    description: type of predictor engine
    type: string
    default: auto
outputs:
  - name: prediction-url
    description: "The URL where the exposed prediction service endpoint can be contacted to run predictions."
    type: string
steps:
  - name: builder
    image: ghcr.io/fuseml/mlflow-builder:dev
    inputs:
      - name: mlflow-codeset
        codeset:
          name: '{{ inputs.mlflow-codeset }}'
          path: /project
    outputs:
      - name: image
  - name: trainer
    image: '{{ steps.builder.outputs.image }}'
    inputs:
      - name: mlflow-codeset
        codeset:
          name: '{{ inputs.mlflow-codeset }}'
          path: '/project'
    outputs:
      - name: mlflow-model-url
    extensions:
      - name: mlflow-tracking
        product: mlflow
        service_resource: mlflow-tracking
      - name: mlflow-store
        product: mlflow
        service_resource: s3
  - name: predictor
    image: ghcr.io/fuseml/kfserving-predictor:dev
    inputs:
      - name: model
        value: '{{ steps.trainer.outputs.mlflow-model-url }}'
      - name: predictor
        value: '{{ inputs.predictor }}'
      - name: mlflow-codeset
        codeset:
          name: '{{ inputs.mlflow-codeset }}'
          path: '/project'
    outputs:
      - name: prediction-url
    extensions:
      - name: s3-storage
        service_resource: s3
      - name: kfserving
        service_resource: kfserving-api
```

To create a workflow from the YAML file with the FuseML CLI:

```
> fuseml workflow create example.yaml 
Workflow "example" successfully created
```

## Application

A FuseML Application is represented by a web service usually deployed automatically by FuseML as a result
of a workflow running to completion and can be accessed via its exposed URL. The most common type of FuseML
application is a prediction service. Use the CLI to display running applications, retrieve their URLs and
delete them when no longer needed.

The application sub-command has the following capabilities:

```bash
> fuseml application --help
Perform operations on applications

Usage:
  fuseml application [command]

Available Commands:
  delete      Delete an application.
  get         Get an application.
  list        List applications.

Flags:
  -h, --help   help for application

Global Flags:
      --timeout int   (FUSEML_HTTP_TIMEOUT) maximum number of seconds to wait for response (default 30)
  -u, --url string    (FUSEML_SERVER_URL) URL where the FuseML service is running
  -v, --verbose       (FUSEML_VERBOSE) print verbose information, such as HTTP request and response details

Use "fuseml application [command] --help" for more information about a command.
```
