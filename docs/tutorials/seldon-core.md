# A simple logistic regression with MLFlow and Seldon-Core

This is another example that shows how FuseML can be used to automate and end-to-end machine learning workflow
using a combination of different tools. In this case, we have a scikit-learn ML model that is being trained
using [MLflow](https://mlflow.org/) and then served with [Seldon Core](https://www.seldon.io/tech/products/core/).

In fact, we're using the same MLFlow models like in the [kserve tutorial](kserve-basic.md).

We assume that both FuseML infrastructure and the FuseML CLI are already installed, if not please
check first the [quick start](../quickstart.md) section.

## 1. Install 3rd party ML tools

Running this example requires MLflow and SeldonCore to be installed in the same cluster as FuseML.

The FuseML installer can be used for a quick MLFlow and KFServing installation:

```bash
fuseml-installer extensions --add mlflow,seldon-core
```

To find out about installed extensions, install new or remove installed ones, use

```bash
fuseml-installer extensions --help
```

command.

## 2. Set `FUSEML_SERVER_URL` environment variable

The fuseml-core URL was printed out by the installer during the FuseML installation. Alternatively, the
following command can be used to retrieve the fuseml-core URL and set the `FUSEML_SERVER_URL` environment variable:

```bash
export FUSEML_SERVER_URL=http://$(kubectl get VirtualService -n fuseml-core fuseml-core -o jsonpath="{.spec.hosts[0]}")
```

## 3. Fetch the FuseML examples code

```bash
git clone --depth 1 -b release-0.3 https://github.com/fuseml/examples.git
cd examples
```

Under the `codesets/mlflow` directory, there are some example MLflow projects. For this tutorial we will be using the
`sklearn` project.

**4.** Register the codeset

From now on, you start using _fuseml_ command line tool. Register the example code as a FuseML versioned codeset artifact:

```bash
fuseml codeset register --name "mlflow-test" --project "mlflow-project-01" codesets/mlflow/sklearn
```

Example output:

```bash
> fuseml codeset register --name "mlflow-test" --project "mlflow-project-01" codesets/mlflow/sklearn
2021/09/08 12:27:40 Pushing the code to the git repository...
Codeset http://gitea.172.18.0.2.nip.io/mlflow-project-01/mlflow-test.git successfully registered
Saving new username into config file as current username.
Saving new password into config file as current password.
Setting mlflow-test as current codeset.
Setting mlflow-project-01 as current project.
FuseML configuration file created at /home/snica/.config/fuseml/config.yaml
```

You may optionally log into the Gitea UI using the URL, username and password printed out by the `codeset register` command. You should find a new organization named `mlflow-project-01` and a repository named `mlflow-test`.

## 5. Create a workflow

The example FuseML workflow included in the examples repository represents a complete, end-to-end ML pipeline "compatible" with any codeset that contains an MLProject. It includes all the steps necessary to train a model with MLflow, save the model and then creates a KFServing prediction service for it.

Use the example workflow definition to create a workflow in FuseML:

```bash
fuseml workflow create workflows/mlflow-seldon-e2e.yaml
```

Note: you can modify the workflow to fit to your custom needs. Let's take a look at some parameters on the top of workflow description:

```yaml
inputs:
  - name: mlflow-codeset
    description: an MLFlow compatible codeset
    type: codeset
  - name: predictor
    description: type of predictor engine
    type: string
    default: auto
```

That `predictor` option is set to `auto` value - this means the predictor engine will be set automatically based on the properties
of the model. With the model we are using in this tutorial, the prediction value will be set to 'sklearn' value and Seldon Core will use
SKLearn server. You could change the default value to `tensorflow` or `triton` to use different inference servers; that is, if your model supports it.

## 6. Assign the workflow to the codeset

```bash
fuseml workflow assign --name mlflow-seldon-e2e --codeset-name mlflow-test --codeset-project mlflow-project-01
```

## 7. Monitor the workflow from the command-line

Now that the Workflow is assigned to the Codeset, a new workflow run was created. To watch the workflow progress, check "workflow run" with:

```bash
fuseml workflow list-runs --name mlflow-seldon-e2e
```

Example output:

```bash
> fuseml workflow list-runs --name mlflow-seldon-e2e
+--------------------------------------------+-------------------+---------------+----------+---------+
| NAME                                       | WORKFLOW          | STARTED       | DURATION | STATUS  |
+--------------------------------------------+-------------------+---------------+----------+---------+
| fuseml-mlflow-project-01-mlflow-test-n5xdq | mlflow-seldon-e2e | 6 seconds ago | ---      | Running |
+--------------------------------------------+-------------------+---------------+----------+---------+
```

This command shows you detailed information about running workflow. You may also follow the Tekton URL value under the expanded output section to see relevant information about the underlying Tekton PipelineRun which implements the workflow run:

```yaml
> fuseml workflow list-runs --name mlflow-seldon-e2e --format yaml
---
- name: fuseml-mlflow-project-01-mlflow-test-n5xdq
  workflowref: mlflow-seldon-e2e
  inputs:
  - input:
      name: mlflow-codeset
      description: an MLFlow compatible codeset
      type: codeset
      default: null
      labels: []
    value: http://gitea.172.18.0.2.nip.io/mlflow-project-01/mlflow-test.git:main
  - input:
      name: predictor
      description: type of predictor engine
      type: string
      default: auto
      labels: []
    value: auto
  outputs:
  - output:
      name: prediction-url
      description: The URL where the exposed prediction service endpoint can be contacted to run predictions.
      type: string
    value: ""
  starttime: 2021-11-09T07:49:45Z
  completiontime: 0001-01-01T00:00:00Z
  status: Running
  url: "http://tekton.172.18.0.2.nip.io/#/namespaces/fuseml-workloads/pipelineruns/fuseml-mlflow-project-01-mlflow-test-n5xdq"
```

Once the run succeeds, the status value changes to `Succeeded` in the CLI:

```bash
> fuseml workflow list-runs --name mlflow-seldon-e2e
+--------------------------------------------+-------------------+----------------+------------+-----------+
| NAME                                       | WORKFLOW          | STARTED        | DURATION   | STATUS    |
+--------------------------------------------+-------------------+----------------+------------+-----------+
| fuseml-mlflow-project-01-mlflow-test-n5xdq | mlflow-seldon-e2e | 12 minutes ago | 10 minutes | Succeeded |
+--------------------------------------------+-------------------+----------------+------------+-----------+
```

## 8. Test the deployed model

When the workflow run is complete, a new inference service is created and registered as a FuseML application. You can list the applications deployed
by FuseML by running the following command:

```bash
fuseml application list
```

This should produce output similar to this one:

```bash
> fuseml application list
+-------------------------------------------------+-----------+-----------------------------------------------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+-------------------+
| NAME                                            | TYPE      | DESCRIPTION                                         | URL                                                                                                                                                                          | WORKFLOW          |
+-------------------------------------------------+-----------+-----------------------------------------------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+-------------------+
| mlflow-project-01-mlflow-test-mlflow-seldon-e2e | predictor | Application generated by mlflow-seldon-e2e workflow | http://mlflow-project-01-mlflow-test-mlflow-seldon-e2e.seldon.172.18.0.2.nip.io/seldon/fuseml-workloads/mlflow-project-01-mlflow-test-mlflow-seldon-e2e/api/v1.0/predictions | mlflow-seldon-e2e |
+-------------------------------------------------+-----------+-----------------------------------------------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+-------------------+
```

The application URL is used to submit a request to the inference service. The examples repository includes a prediction data sample at
`prediction/data-sklearn-seldon.json`:

```bash
cat prediction/data-sklearn-seldon.json
{
    "data": {
        "ndarray": [
            [
                12.8,
                0.029,
                0.48,
                0.98,
                6.2,
                29,
                7.33,
                1.2,
                0.39,
                90,
                0.86
            ]
        ]
    }
}
```

See that the format of the data sample is different then the one we have used for [kserve example](kserve-basic.md).
It's because with sklearn based example, inference server is set up to communicate with [Seldon Protocol](https://docs.seldon.io/projects/seldon-core/en/latest/graph/protocols.html#rest-and-grpc-seldon-protocol). Alternatively,
for codesets using tensorflow, seldon-core based inference server would be set up with [tensorflow protocol](https://docs.seldon.io/projects/seldon-core/en/latest/graph/protocols.html#rest-and-grpc-seldon-protocol).

Run the following commands to send a inference request to the deployed model:

```bash
export PREDICTOR_URL=$(fuseml application list --format json | jq -r ".[0].url")
curl -d @prediction/data-sklearn-seldon.json $PREDICTOR_URL -H "Accept: application/json" -H "Content-Type: application/json" | jq
```

The output will be something similar to:

```json
{
  "data": {
    "names": [],
    "ndarray": [6.48634480912767]
  },
  "meta": {
    "requestPath": {
      "classifier": "seldonio/sklearnserver:1.11.0"
    }
  }
}
```
