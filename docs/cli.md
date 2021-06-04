# FuseML Command-Line Reference

Using the FuseML CLI is a frictionless experience. Let's deep dive into the various options you may use with it.
Let's start looking at the global capabilites. Simply type:

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
  help        Help about any command
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
If you missed it, you can retrieve it at any time with the following command:

```bash
export FUSEML_SERVER_URL=http://$(kubectl get VirtualService -n fuseml-core fuseml-core -o jsonpath="{.spec.hosts[0]}")
```

## Codesets

A FuseML Codeset represents a versioned collection of files - code files, scripts, configuration files, generally all the sources needed to implement, build and execute the machine learning logic. The codeset is the "link" between your local environment and the Git-a-like repository where you and your team are working. Use the CLI to publish your ML code to the remote FuseML orchestrator instance and later on assign it to compatible automation workflows.

The codeset sub-command has the following capabilites:

```bash
Perform operations on codesets

Usage:
  fuseml codeset [command]

Available Commands:
  delete      Delete codesets.
  get         Get codesets.
  list        List codesets.
  register    Register codesets.

Flags:
  -h, --help   help for codeset

Global Flags:
      --timeout int   (FUSEML_HTTP_TIMEOUT) maximum number of seconds to wait for response (default 30)
  -u, --url string    (FUSEML_SERVER_URL) URL where the FuseML service is running
  -v, --verbose       (FUSEML_VERBOSE) print verbose information, such as HTTP request and response details

Use "fuseml codeset [command] --help" for more information about a command.
```

## Workflow

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

The workflow sub-command has the following capabilites:

```bash
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

Following is an example of workflow definition in YAML format describing an end-to-end ML pipeline:

```yml
name: < INSERT YOUR WORKFLOW NAME>
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
    image: ghcr.io/fuseml/mlflow-dockerfile:0.1
    inputs:
      - codeset:
          name: '{{ inputs.mlflow-codeset }}'
          path: /project
    outputs:
      - name: mlflow-env
        image:
          name: 'registry.fuseml-registry/mlflow-builder/{{ inputs.mlflow-codeset.name }}:{{ inputs.mlflow-codeset.version }}'
  - name: trainer
    image: '{{ steps.builder.outputs.mlflow-env }}'
    inputs:
      - codeset:
          name: '{{ inputs.mlflow-codeset }}'
          path: '/project'
    outputs:
      - name: mlflow-model-url
    env:
      - name: MLFLOW_TRACKING_URI
        value: "http://mlflow"
      - name: MLFLOW_S3_ENDPOINT_URL
        value: "http://mlflow-minio:9000"
      - name: AWS_ACCESS_KEY_ID
        value: < INSERT YOUR MINIO ACCESS KEY>
      - name: AWS_SECRET_ACCESS_KEY
        value: < INSERT YOUR MINIO SECRET KEY>
  - name: predictor
    image: ghcr.io/fuseml/kfserving-predictor:0.1
    inputs:
      - name: model
        value: '{{ steps.trainer.outputs.mlflow-model-url }}'
      - name: predictor
        value: '{{ inputs.predictor }}'
      - codeset:
          name: '{{ inputs.mlflow-codeset }}'
          path: '/project'
    outputs:
      - name: prediction-url
    env:
      - name: AWS_ACCESS_KEY_ID
        value: < INSERT YOUR MINIO ACCESS KEY>
      - name: AWS_SECRET_ACCESS_KEY
        value: < INSERT YOUR MINIO SECRET KEY>

```

---
**NOTE**

The values AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY may be retrieved easily with the below commands:

```bash
export ACCESS=$(kubectl get secret -n fuseml-workloads mlflow-minio -o json| jq -r '.["data"]["accesskey"]' | base64 -d)
export SECRET=$(kubectl get secret -n fuseml-workloads mlflow-minio -o json| jq -r '.["data"]["secretkey"]' | base64 -d)
```

Now replace the original values in the pipeline-01.yaml example. You can do it by editing the file manually or by running following command:

```bash
sed -i -e "/AWS_ACCESS_KEY_ID/{N;s/value: [^ \t]*/value: $ACCESS/}" pipelines/pipeline-01.yaml
sed -i -e "/AWS_SECRET_ACCESS_KEY/{N;s/value: [^ \t]*/value: $SECRET/}" pipelines/pipeline-01.yaml
```

---

## Application

A FuseML Application is represented by a web service usually deployed automatically by FuseML as a result
of a workflow running to completion and can be accessed via its exposed URL. The most common type of FuseML
application is a prediction service. Use the CLI to display running applications, retrieve their URLs and
delete them when no longer needed.

The application sub-command has the following capabilites:

```bash
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
