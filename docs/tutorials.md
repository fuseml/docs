# FuseML Tutorials

Testing FuseML is simpler than one may think. Let's showcase some use cases.

## Example 1 - A simple logistic regression with MLFlow and KFServing

This example shows how FuseML can be used to automate and end-to-end machine learning workflow using
a combination of different tools. In this case, we have a scikit-learn ML model that is being trained
using [MLflow](https://mlflow.org/) and then served with [KFServing](https://github.com/kubeflow/kfserving).

We assume that both FuseML infrastructure and the FuseML CLI are already installed, if not please
check first the [quick start](quickstart.md) section.

**1.** Install 3rd party ML tools

Running this example requires MLflow and KFServing to be installed in the same cluster as FuseML.

For a quick MLFlow and KFServing installation, run the installer with the appropriate values for `--extensions`
option.


```bash
fuseml-installer install --extensions mlflow,kfserving
```

To find out about installed extensions, install new or remove installed ones, use

```bash
fuseml-installer extensions --help
```

command.

Alternatively, you can follow [the KFServing official instructions](https://github.com/kubeflow/kfserving/blob/master/README.md)
and install KFServing manually.

**2.** Set `FUSEML_SERVER_URL` environment variable to point to fuseml-core

The fuseml-core URL was printed out by the installer during the FuseML installation.Alternatively, you can run the following
command to retrieve the fuseml-core URL and set the `FUSEML_SERVER_URL` environment variable:

```bash
export FUSEML_SERVER_URL=http://$(kubectl get VirtualService -n fuseml-core fuseml-core -o jsonpath="{.spec.hosts[0]}")
```

**3.** Fetch the FuseML examples code

```bash
git clone --depth 1 -b release-0.2 https://github.com/fuseml/examples.git
cd examples
```

Under the `codesets/mlflow` directory, there are some example MLflow projects. For this tutorial we will be using the
`sklearn` project.

**4.** Register the codeset

From now on, you start using *fuseml* command line tool. Register the example code as a FuseML versioned codeset artifact:

```bash
fuseml codeset register --name "mlflow-test" --project "mlflow-project-01" codesets/mlflow/sklearn
```

Example output:

```bash
> fuseml codeset register --name "mlflow-test" --project "mlflow-project-01" codesets/mlflow/sklearn
2021/06/07 18:30:08 Pushing the code to the git repository...
Codeset http://gitea.10.162.66.101.omg.howdoi.website/mlflow-project-01/mlflow-test.git successfully registered
Username for accessing the project: <username>
Password for accessing the project: <password>
```

You may optionally log into the Gitea UI using the URL, username and password printed out by the `codeset register` command. You should find a new organization named `mlflow-project-01` and a repo named `mlflow-test`.

**5.** Create a workflow

The example FuseML workflow included in the examples repository represents a complete, end-to-end ML pipeline "compatible" with any codeset that contains an MLProject. It includes all the steps necessary to train a model with MLflow, save the model and then creates a KFServing prediction service for it.

Use the example workflow definition to create a workflow in FuseML:

```bash
fuseml workflow create workflows/mlflow-e2e.yaml
```

**6.** Assign the codeset to the workflow

```bash
fuseml workflow assign --name mlflow-e2e --codeset-name mlflow-test --codeset-project mlflow-project-01
``` 

**7.** Monitor the workflow from the command-line

Now that the Workflow is assigned to the Codeset, a new workflow run was created. To watch the workflow progress, check "workflow run" with:

```bash
fuseml workflow list-runs --name mlflow-e2e
```

Example output:

```
> fuseml workflow list-runs --name mlflow-e2e
+--------------------------------------------+------------+--------------+----------+---------+
| NAME                                       | WORKFLOW   | STARTED      | DURATION | STATUS  |
+--------------------------------------------+------------+--------------+----------+---------+
| fuseml-mlflow-project-01-mlflow-test-mlprp | mlflow-e2e | 1 minute ago | ---      | Running |
+--------------------------------------------+------------+--------------+----------+---------+
```

This command shows you detailed information about running workflow. You may also follow the Tekton URL value under the expanded output section to see relevant information about the underlying Tekton PipelineRun which implements the workflow run:


```
> fuseml workflow list-runs --name mlflow-e2e --format yaml
---
- name: fuseml-mlflow-project-01-mlflow-test-hr67k
  workflowref: mlflow-e2e
  inputs:
  - input:
      name: mlflow-codeset
      description: an MLFlow compatible codeset
      type: codeset
      default: null
      labels: []
    value: http://gitea.10.162.66.101.omg.howdoi.website/mlflow-project-01/mlflow-test.git:main
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
    value: null
  starttime: 2021-06-07T18:16:00Z
  completiontime: null
  status: Running
  url: "http://tekton.10.162.66.101.omg.howdoi.website/#/namespaces/fuseml-workloads/pipelineruns/fuseml-mlflow-project-01-mlflow-test-hr67k"
```

Once the run succeeds, the status value changes to `Succeeded` in the CLI:

```
> fuseml workflow list-runs --name mlflow-e2e
+--------------------------------------------+------------+----------------+------------+-----------+
| NAME                                       | WORKFLOW   | STARTED        | DURATION   | STATUS    |
+--------------------------------------------+------------+----------------+------------+-----------+
| fuseml-mlflow-project-01-mlflow-test-mlprp | mlflow-e2e | 22 minutes ago | 22 minutes | Succeeded |
+--------------------------------------------+------------+----------------+------------+-----------+
```

**8.** Test the deployed model

When the workflow run is complete, a new inference service is created and registered as a FuseML application. You can list the applications deployed
by FuseML by running the following command:

```bash
fuseml application list
```

This should produce output similar to this one:

```
> fuseml application list
+-------------------------------+-----------+----------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------+------------+
| NAME                          | TYPE      | DESCRIPTION                                  | URL                                                                                                                                  | WORKFLOW   |
+-------------------------------+-----------+----------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------+------------+
| mlflow-project-01-mlflow-test | predictor | Application generated by mlflow-e2e workflow | http://mlflow-project-01-mlflow-test.fuseml-workloads.10.162.66.101.omg.howdoi.website/v2/models/mlflow-project-01-mlflow-test/infer | mlflow-e2e |
+-------------------------------+-----------+----------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------+------------+
```

The application URL is used to submit a request to the inference service. The examples repository includes a prediction data sample at
`prediction/data-sklearn.json`:

```bash
cat prediction/data-sklearn.json
{
    "inputs": [
    {
        "name": "input-0",
        "shape": [1, 11],
        "datatype": "FP32",
        "data": [
        [12.8, 0.029, 0.48, 0.98, 6.2, 29, 7.33, 1.2, 0.39, 90, 0.86]
        ]
    }
    ]
}
```

Run the following commands to send a inference request to the deployed model:

```bash
export PREDICTOR_URL=$(fuseml application list --format json | jq -r ".[0].url")
curl -d @prediction/data-sklearn.json $PREDICTOR_URL | jq
```

The output will be something similar to:

```json
{
    "model_name":"mlflow-project-01-mlflow-test",
    "model_version":null,
    "id":"44d5d037-052b-49b6-aace-1c5346a35004",
    "parameters":null,
    "outputs": [
    {
        "name":"predict",
        "shape":[1],
        "datatype":"FP32",
        "parameters":null,
        "data": [ 6.486344809506676 ]
    }
    ]
}
```

**9.** (Optional) Use the webapp example to test the deployed model

Rather than using curl to exercise the inference service, you may use a simple app we developed using [streamlit](https://streamlit.io/).

First, deploy the application into your kubernetes cluster by running the following command:

```bash
kubectl apply -f webapps/winery/service.yaml
```

Run the following command to check the application deployment status:
```bash
kubectl get ksvc -n fuseml-workloads winery
```

At some point it should reach the `READY` status and a URL is provided to access the application.
For example:
```bash
❯ kubectl get ksvc -n fuseml-workloads winery
NAME     URL                                                                                LATESTCREATED   LATESTREADY    READY   REASON
winery   http://winery.fuseml-workloads.fuseml-workloads.10.162.66.101.omg.howdoi.website   winery-00001    winery-00001   True
```

Open the application URL and follow the instructions presented on the webpage to make your own predictions with the FuseML application you just deployed.
